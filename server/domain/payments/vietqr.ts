export type BankAccount = {
  bin: string;
  name: string;
  account: string;
  accountName: string;
};

export const BANK: BankAccount = {
  bin: '970432',
  name: 'VPBank',
  account: '168686838',
  accountName: 'DUONG SINH CHESS JSC',
};

export function transferContent(ma: string): string {
  return `DSC ${ma}`;
}

export function vietQrUrl(
  input: { amount: number; ma: string },
  bank: BankAccount = BANK,
): string {
  const query = `amount=${Math.round(input.amount)}&addInfo=${encodeURIComponent(transferContent(input.ma))}&accountName=${encodeURIComponent(bank.accountName)}`;
  return `https://img.vietqr.io/image/${bank.bin}-${bank.account}-compact2.png?${query}`;
}

export type VietQrModel = {
  url: string;
  amount: number;
  content: string;
  ma: string;
};

export function vietQrForDebt(
  record:
    { ma?: string | null; cong_no?: number | string | null } | null | undefined,
): VietQrModel | null {
  const amount = Math.round(Number(record?.cong_no ?? 0));
  if (!record?.ma || !(amount > 0)) {
    return null;
  }
  return {
    url: vietQrUrl({ amount, ma: record.ma }),
    amount,
    content: transferContent(record.ma),
    ma: record.ma,
  };
}
