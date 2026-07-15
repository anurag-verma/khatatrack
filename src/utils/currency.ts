export function formatIndianCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  const numStr = abs.toFixed(0);
  const lastThree = numStr.slice(-3);
  const rest = numStr.slice(0, -3);

  let formatted = '';
  if (rest.length > 0) {
    const pairs: string[] = [];
    let remaining = rest;
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        pairs.unshift(remaining);
        break;
      }
      pairs.unshift(remaining.slice(-2));
      remaining = remaining.slice(0, -2);
    }
    formatted = pairs.join(',') + ',' + lastThree;
  } else {
    formatted = lastThree;
  }

  return `₹ ${sign}${formatted}`;
}

export function formatIndianCurrencyShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹ ${(abs / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹ ${(abs / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹ ${(abs / 1000).toFixed(1)}K`;
  }
  return formatIndianCurrency(amount);
}
