export function calculateSaleTotal({
  salePrice = 0,
  tradeInValue = 0,
  downPayment = 0,
  taxRate = 0.08,
  fees = 0
}) {
  const subtotal = parseFloat(salePrice) - parseFloat(tradeInValue);
  const tax = subtotal * parseFloat(taxRate);
  const total = subtotal + tax + parseFloat(fees);
  const amountFinanced = total - parseFloat(downPayment);
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    fees: parseFloat(fees),
    total: parseFloat(total.toFixed(2)),
    downPayment: parseFloat(downPayment),
    amountFinanced: parseFloat(amountFinanced.toFixed(2))
  };
}

export function calculateMonthlyPayment(principal, annualRate, months) {
  if (!principal || !annualRate || !months) return 0;
  
  const monthlyRate = parseFloat(annualRate) / 100 / 12;
  const numPayments = parseInt(months);
  
  if (monthlyRate === 0) {
    return parseFloat((principal / numPayments).toFixed(2));
  }
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return parseFloat(payment.toFixed(2));
}

export function calculateRepairOrderTotal(items = []) {
  let laborTotal = 0;
  let partsTotal = 0;
  
  items.forEach(item => {
    const totalPrice = parseFloat(item.total_price || 0);
    if (item.type === 'labor') {
      laborTotal += totalPrice;
    } else if (item.type === 'part') {
      partsTotal += totalPrice;
    }
  });
  
  const subtotal = laborTotal + partsTotal;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  
  return {
    laborTotal: parseFloat(laborTotal.toFixed(2)),
    partsTotal: parseFloat(partsTotal.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

export function calculateTradeInValue(vehicle) {
  // Simplified trade-in calculation
  const baseValue = parseFloat(vehicle.estimatedValue || 0);
  const mileage = parseInt(vehicle.mileage || 0);
  const year = parseInt(vehicle.year || new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  
  // Depreciation factors
  const ageDepreciation = (currentYear - year) * 0.05; // 5% per year
  const mileageDepreciation = (mileage / 100000) * 0.1; // 10% per 100k miles
  
  const depreciation = Math.min(ageDepreciation + mileageDepreciation, 0.5); // Max 50% depreciation
  const value = baseValue * (1 - depreciation);
  
  return parseFloat(value.toFixed(2));
}

export function calculateInventoryValue(vehicles = []) {
  return vehicles.reduce((total, vehicle) => {
    const price = parseFloat(vehicle.purchase_price || 0);
    return total + price;
  }, 0);
}

export function calculateProfit(salePrice, purchasePrice, expenses = 0) {
  const profit = parseFloat(salePrice) - parseFloat(purchasePrice) - parseFloat(expenses);
  const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  
  return {
    profit: parseFloat(profit.toFixed(2)),
    margin: parseFloat(margin.toFixed(2))
  };
}

export function calculateCommission(salePrice, commissionRate = 0.03) {
  const commission = parseFloat(salePrice) * parseFloat(commissionRate);
  return parseFloat(commission.toFixed(2));
}

export function calculateLeadScore(lead) {
  let score = 0;
  
  // Has estimated value
  if (lead.estimated_value && lead.estimated_value > 0) {
    score += 20;
    if (lead.estimated_value > 30000) score += 10;
  }
  
  // Lead source quality
  const highQualitySources = ['Referral', 'Website', 'Repeat Customer'];
  if (highQualitySources.includes(lead.lead_source)) {
    score += 15;
  }
  
  // Contact information completeness
  if (lead.contact_email) score += 10;
  if (lead.contact_phone) score += 10;
  
  // Follow-up scheduling
  if (lead.follow_up_date) score += 15;
  
  // Vehicle interest specified
  if (lead.vehicle_interested) score += 10;
  
  // Time since inquiry (fresher leads score higher)
  if (lead.inquiry_date) {
    const daysSince = (Date.now() - new Date(lead.inquiry_date)) / (1000 * 60 * 60 * 24);
    if (daysSince < 1) score += 20;
    else if (daysSince < 7) score += 10;
  }
  
  return Math.min(score, 100);
}