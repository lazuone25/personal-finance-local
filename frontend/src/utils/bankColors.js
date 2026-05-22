const BANK_COLORS = {
  'ING': '#FF6200',
  'Raiffeisen': '#FFD700',
  'Revolut': '#A8A9AD',
}

export function getBankColor(bankName) {
  return BANK_COLORS[bankName] || '#6C757D'
}
