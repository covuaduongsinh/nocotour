import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

/**
 * Hybrid B2B & B2C Schema Extension for Chess Training Academy & Chess Bookstore.
 * - Adds customerType to crmLeads, crmCompanies, crmContacts ('individual' | 'organization').
 * - Adds pipelineType and chess-specific fields to crmOpportunities.
 * - Creates crmStudents collection for chess students (linked to Parent/Contact).
 * - Creates crmProducts collection for books, chessboards, clocks, courses.
 */
const migration: MigrationDefinition = defineMigration({
  name: '202611030001_crm_chess_b2c_hybrid',
  async up({ builder }: MigrationContext): Promise<void> {
    // 1. Extend crmLeads for B2C Individuals (Parents) vs B2B Organizations
    await builder.alterCollection('crmLeads', (c) => {
      c.string('customerType', { length: 32, defaultValue: 'individual' });
      c.string('studentName').nullable();
      c.string('studentBirthYear', { length: 10 }).nullable();
      c.string('chessLevel', { length: 64 }).nullable();
    });

    // 2. Extend crmContacts for Parents / Individual Buyers
    await builder.alterCollection('crmContacts', (c) => {
      c.string('customerType', { length: 32, defaultValue: 'individual' });
    });

    // 3. Extend crmOpportunities for Chess Tuition vs Bookstore Orders
    await builder.alterCollection('crmOpportunities', (c) => {
      c.string('pipelineType', { length: 32, defaultValue: 'tuition' });
      c.string('studentName').nullable();
      c.string('chessLevel', { length: 64 }).nullable();
    });

    // 4. Create crmStudents (Chess Students profile)
    await builder.createCollection('crmStudents', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.string('contactId', { length: 36 }).nullable();
      c.index('contactId');
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('createdById', { length: 64, nullable: false });
      c.string('gender', { length: 16 }).nullable();
      c.datetimeTz('birthDate').nullable();
      c.string('school').nullable();
      c.string('grade', { length: 32 }).nullable();
      c.string('chessLevel', { length: 64, defaultValue: 'beginner' });
      c.integer('ratingElo').nullable();
      c.text('notes').nullable();
      c.boolean('active', { defaultValue: true });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 5. Create crmProducts (Chess Bookstore & Equipment)
    await builder.createCollection('crmProducts', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.string('code', { length: 64 }).nullable();
      c.string('category', { length: 64, nullable: false });
      c.decimal('price', { precision: 18, scale: 2, nullable: false });
      c.string('currency', { length: 3, defaultValue: 'VND' });
      c.integer('stock', { defaultValue: 0 });
      c.text('description').nullable();
      c.json('attachments').nullable();
      c.boolean('active', { defaultValue: true });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
  },

  async down({ builder }: MigrationContext): Promise<void> {
    await builder.dropCollection('crmProducts');
    await builder.dropCollection('crmStudents');

    await builder.alterCollection('crmOpportunities', (c) => {
      c.dropField('chessLevel');
      c.dropField('studentName');
      c.dropField('pipelineType');
    });

    await builder.alterCollection('crmContacts', (c) => {
      c.dropField('customerType');
    });

    await builder.alterCollection('crmLeads', (c) => {
      c.dropField('chessLevel');
      c.dropField('studentBirthYear');
      c.dropField('studentName');
      c.dropField('customerType');
    });
  },
});

export default migration;
