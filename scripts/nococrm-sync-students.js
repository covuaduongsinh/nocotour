#!/usr/bin/env node
/**
 * NocoCRM to NocoBase Core Student Synchronizer
 * Syncs enrolled students and parent contacts from NocoCRM (crm.sqlite)
 * to NocoBase Core (database.sqlite) for Chess Academy Duong Sinh.
 */

const Database = require('/srv/nocobase-dsc/releases/current/dist/node_modules/better-sqlite3');
const { SnowflakeIdGenerator } = require('/srv/nocobase-dsc/releases/current/dist/node_modules/@nocobase/snowflake');

const CRM_DB_PATH = '/srv/nococrm-dsc/storage/crm.sqlite';
const NOCOBASE_DB_PATH = '/srv/nocobase-dsc/storage/database.sqlite';

function log(msg) {
  const now = new Date().toISOString();
  console.log(`[${now}] ${msg}`);
}

function normalizePhone(phone) {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, '');
}

function normalizeGender(gender) {
  if (!gender) return null;
  const g = gender.toString().toLowerCase();
  if (g === 'male' || g === 'nam' || g === 'boy') return 'nam';
  if (g === 'female' || g === 'nu' || g === 'nữ' || g === 'girl') return 'nu';
  return null;
}

function getNextStudentCode(ncDb) {
  const row = ncDb.prepare(
    "SELECT ma_hoc_vien FROM dsc_hoc_vien WHERE ma_hoc_vien LIKE 'HV%' ORDER BY length(ma_hoc_vien) DESC, ma_hoc_vien DESC LIMIT 1"
  ).get();

  let nextNum = 1;
  if (row && row.ma_hoc_vien) {
    const m = row.ma_hoc_vien.match(/HV(\d+)/);
    if (m) {
      nextNum = parseInt(m[1], 10) + 1;
    }
  }
  return `HV${String(nextNum).padStart(5, '0')}`;
}

function runSync() {
  log('Starting student synchronization from NocoCRM to NocoBase Core...');

  const crmDb = new Database(CRM_DB_PATH);
  const ncDb = new Database(NOCOBASE_DB_PATH);
  const sf = new SnowflakeIdGenerator({ workerId: 0, epochSeconds: 1605024000 });

  const defaultAdmin = crmDb.prepare("SELECT id FROM user LIMIT 1").get();
  const defaultOwnerId = defaultAdmin ? defaultAdmin.id : '7dab7278-68e8-4d96-a41e-75742263c8e7';

  // 1. Ensure sync tracking columns in crm_students
  const studentCols = crmDb.prepare("PRAGMA table_info(crm_students)").all().map(c => c.name);
  if (!studentCols.includes('nocobase_student_id')) {
    crmDb.prepare("ALTER TABLE crm_students ADD COLUMN nocobase_student_id BIGINT").run();
  }
  if (!studentCols.includes('synced_at')) {
    crmDb.prepare("ALTER TABLE crm_students ADD COLUMN synced_at DATETIME").run();
  }

  // 2. Auto-import won opportunities with student_name into crm_students if not exists
  const wonOpps = crmDb.prepare(`
    SELECT o.id, o.student_name, o.chess_level, o.contacts, o.owner_id, o.created_at
    FROM crm_opportunities o
    WHERE o.stage = 'closed_won' AND o.student_name IS NOT NULL AND TRIM(o.student_name) != ''
  `).all();

  const insertStudentStmt = crmDb.prepare(`
    INSERT INTO crm_students (id, name, contact_id, owner_id, created_by_id, chess_level, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const opp of wonOpps) {
    const existing = crmDb.prepare("SELECT id FROM crm_students WHERE name = ?").get(opp.student_name.trim());
    if (!existing) {
      const studentId = require('crypto').randomUUID();
      let contactId = null;
      if (opp.contacts) {
        try {
          const parsed = JSON.parse(opp.contacts);
          contactId = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (_) {
          contactId = opp.contacts;
        }
      }
      const owner = opp.owner_id || defaultOwnerId;
      insertStudentStmt.run(studentId, opp.student_name.trim(), contactId, owner, owner, opp.chess_level || null, opp.created_at, opp.created_at);
      log(`Imported won opportunity student '${opp.student_name}' into NocoCRM students`);
    }
  }

  // 3. Auto-import converted leads with student_name into crm_students if not exists
  const convertedLeads = crmDb.prepare(`
    SELECT l.id, l.student_name, l.student_birth_year, l.chess_level, l.converted_contact_id, l.owner_id, l.created_at
    FROM crm_leads l
    WHERE l.status = 'converted' AND l.student_name IS NOT NULL AND TRIM(l.student_name) != ''
  `).all();

  for (const lead of convertedLeads) {
    const existing = crmDb.prepare("SELECT id FROM crm_students WHERE name = ?").get(lead.student_name.trim());
    if (!existing) {
      const studentId = require('crypto').randomUUID();
      const birthYear = lead.student_birth_year ? parseInt(lead.student_birth_year, 10) : null;
      const birthDate = birthYear ? `${birthYear}-01-01` : null;
      const owner = lead.owner_id || defaultOwnerId;
      crmDb.prepare(`
        INSERT INTO crm_students (id, name, contact_id, owner_id, created_by_id, birth_date, chess_level, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(studentId, lead.student_name.trim(), lead.converted_contact_id || null, owner, owner, birthDate, lead.chess_level || null, lead.created_at, lead.created_at);
      log(`Imported converted lead student '${lead.student_name}' into NocoCRM students`);
    }
  }

  // 4. Fetch all unsynced or updated students from crm_students
  const unsyncedStudents = crmDb.prepare(`
    SELECT s.*, c.name as parent_name, c.phone as parent_phone, c.email as parent_email
    FROM crm_students s
    LEFT JOIN crm_contacts c ON s.contact_id = c.id
    WHERE s.active = 1 AND (s.synced_at IS NULL OR s.updated_at > s.synced_at)
  `).all();

  log(`Found ${unsyncedStudents.length} student(s) to synchronize to NocoBase Core.`);

  let syncedCount = 0;
  const nowStr = new Date().toISOString();
  const todayStr = nowStr.substring(0, 10);

  for (const student of unsyncedStudents) {
    try {
      let parentId = null;

      // Handle Parent
      if (student.parent_name || student.parent_phone) {
        const cleanPhone = normalizePhone(student.parent_phone);
        let existingParent = null;

        if (cleanPhone) {
          existingParent = ncDb.prepare("SELECT id FROM dsc_phu_huynh WHERE dien_thoai = ?").get(cleanPhone);
        }
        if (!existingParent && student.parent_name) {
          existingParent = ncDb.prepare("SELECT id FROM dsc_phu_huynh WHERE ho_ten = ?").get(student.parent_name.trim());
        }

        if (existingParent) {
          parentId = existingParent.id;
        } else {
          parentId = sf.generate();
          ncDb.prepare(`
            INSERT INTO dsc_phu_huynh (id, ho_ten, dien_thoai, email, ghi_chu, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 'Đồng bộ từ NocoCRM', ?, ?)
          `).run(
            parentId,
            student.parent_name ? student.parent_name.trim() : 'Phụ huynh ' + student.name,
            cleanPhone,
            student.parent_email || null,
            nowStr,
            nowStr
          );
          log(`Created parent in NocoBase: ${student.parent_name} (ID: ${parentId})`);
        }
      }

      // Handle Student
      let ncStudentId = student.nocobase_student_id;
      let existingNcStudent = null;

      if (ncStudentId) {
        existingNcStudent = ncDb.prepare("SELECT id, ma_hoc_vien FROM dsc_hoc_vien WHERE id = ?").get(ncStudentId);
      }
      if (!existingNcStudent) {
        existingNcStudent = ncDb.prepare("SELECT id, ma_hoc_vien FROM dsc_hoc_vien WHERE ho_ten = ?").get(student.name.trim());
      }

      const gender = normalizeGender(student.gender);
      const birthDate = student.birth_date ? student.birth_date.substring(0, 10) : null;
      const elo = student.rating_elo ? parseInt(student.rating_elo, 10) : 0;

      if (existingNcStudent) {
        ncStudentId = existingNcStudent.id;
        ncDb.prepare(`
          UPDATE dsc_hoc_vien
          SET truong = COALESCE(?, truong),
              lop_o_truong = COALESCE(?, lop_o_truong),
              elo = CASE WHEN ? > 0 THEN ? ELSE elo END,
              updatedAt = ?
          WHERE id = ?
        `).run(student.school || null, student.grade || null, elo, elo, nowStr, ncStudentId);
        log(`Updated existing student in NocoBase: ${student.name} (${existingNcStudent.ma_hoc_vien})`);
      } else {
        ncStudentId = sf.generate();
        const maHocVien = getNextStudentCode(ncDb);

        ncDb.prepare(`
          INSERT INTO dsc_hoc_vien (
            id, ma_hoc_vien, ho_ten, ngay_sinh, gioi_tinh, truong, lop_o_truong,
            trang_thai, ngay_nhap_hoc, elo, ghi_chu, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'dang_hoc', ?, ?, 'Đồng bộ từ NocoCRM', ?, ?)
        `).run(
          ncStudentId,
          maHocVien,
          student.name.trim(),
          birthDate,
          gender,
          student.school || null,
          student.grade || null,
          todayStr,
          elo,
          nowStr,
          nowStr
        );
        log(`Created new student in NocoBase: ${student.name} (Mã: ${maHocVien}, ID: ${ncStudentId})`);
      }

      // Link Student and Parent in dsc_hoc_vien_phu_huynh
      if (parentId && ncStudentId) {
        const existingLink = ncDb.prepare(
          "SELECT 1 FROM dsc_hoc_vien_phu_huynh WHERE dscHocVienId = ? AND dscPhuHuynhId = ?"
        ).get(ncStudentId, parentId);

        if (!existingLink) {
          ncDb.prepare(`
            INSERT INTO dsc_hoc_vien_phu_huynh (dscHocVienId, dscPhuHuynhId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?)
          `).run(ncStudentId, parentId, nowStr, nowStr);
          log(`Linked student ${student.name} with parent in NocoBase.`);
        }
      }

      // Mark as synced in NocoCRM
      crmDb.prepare(`
        UPDATE crm_students
        SET nocobase_student_id = ?, synced_at = ?
        WHERE id = ?
      `).run(ncStudentId, nowStr, student.id);

      syncedCount++;
    } catch (err) {
      log(`Error syncing student ${student.name}: ${err.message}`);
    }
  }

  log(`Synchronization finished. Successfully processed ${syncedCount} student(s).`);
  crmDb.close();
  ncDb.close();
}

try {
  runSync();
} catch (err) {
  log(`Fatal error during sync: ${err.message}`);
  process.exit(1);
}
