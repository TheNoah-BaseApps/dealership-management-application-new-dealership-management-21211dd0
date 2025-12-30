import { calculateLeadScore } from './calculations';

export async function scoreLeads(leads) {
  try {
    return leads.map(lead => ({
      ...lead,
      aiScore: calculateLeadScore(lead),
      priority: getLeadPriority(calculateLeadScore(lead))
    }));
  } catch (error) {
    console.error('Error scoring leads:', error);
    return leads;
  }
}

export function getLeadPriority(score) {
  if (score >= 80) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

export async function generateEngagementRecommendations(customer, history) {
  try {
    const recommendations = [];
    
    // Analyze purchase history
    if (history.purchases && history.purchases.length > 0) {
      const lastPurchase = history.purchases[0];
      const daysSinceLastPurchase = (Date.now() - new Date(lastPurchase.sale_date)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastPurchase > 1095) { // 3 years
        recommendations.push({
          type: 'vehicle_upgrade',
          priority: 'High',
          message: 'Customer may be ready for a vehicle upgrade',
          action: 'Send promotional email about new inventory'
        });
      }
    }
    
    // Analyze service history
    if (history.services && history.services.length > 0) {
      const lastService = history.services[0];
      const daysSinceLastService = (Date.now() - new Date(lastService.service_date)) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastService > 180) { // 6 months
        recommendations.push({
          type: 'service_reminder',
          priority: 'Medium',
          message: 'Customer is due for routine maintenance',
          action: 'Send service reminder email/SMS'
        });
      }
    }
    
    // Communication frequency analysis
    if (history.communications && history.communications.length > 0) {
      const recentComms = history.communications.filter(comm => {
        const days = (Date.now() - new Date(comm.sent_date)) / (1000 * 60 * 60 * 24);
        return days <= 30;
      });
      
      if (recentComms.length === 0) {
        recommendations.push({
          type: 'engagement',
          priority: 'Low',
          message: 'No recent communication with customer',
          action: 'Send personalized check-in message'
        });
      }
    }
    
    // Preferred contact method
    if (customer.preferred_contact) {
      recommendations.push({
        type: 'communication',
        priority: 'Info',
        message: `Customer prefers ${customer.preferred_contact} communication`,
        action: `Use ${customer.preferred_contact} for outreach`
      });
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error generating engagement recommendations:', error);
    return [];
  }
}

export function analyzeSalesTrends(sales, period = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period);
    
    const recentSales = sales.filter(sale => 
      new Date(sale.sale_date) >= cutoffDate
    );
    
    const totalRevenue = recentSales.reduce((sum, sale) => 
      sum + parseFloat(sale.sale_price || 0), 0
    );
    
    const avgSalePrice = recentSales.length > 0 ? 
      totalRevenue / recentSales.length : 0;
    
    const vehicleTypes = recentSales.reduce((acc, sale) => {
      const type = sale.vehicle?.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return {
      period,
      totalSales: recentSales.length,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgSalePrice: parseFloat(avgSalePrice.toFixed(2)),
      popularVehicleTypes: vehicleTypes,
      trend: recentSales.length > 0 ? 'positive' : 'neutral'
    };
  } catch (error) {
    console.error('Error analyzing sales trends:', error);
    return null;
  }
}

export function predictInventoryNeeds(vehicles, sales) {
  try {
    const inventory = {
      available: vehicles.filter(v => v.status === 'Available').length,
      sold: vehicles.filter(v => v.status === 'Sold').length,
      total: vehicles.length
    };
    
    const salesRate = sales.length / 30; // Sales per day
    const daysOfInventory = inventory.available / Math.max(salesRate, 0.1);
    
    let recommendation = '';
    if (daysOfInventory < 30) {
      recommendation = 'Low inventory - consider restocking';
    } else if (daysOfInventory > 90) {
      recommendation = 'High inventory - consider promotions';
    } else {
      recommendation = 'Inventory levels are healthy';
    }
    
    return {
      inventory,
      salesRate: parseFloat(salesRate.toFixed(2)),
      daysOfInventory: parseFloat(daysOfInventory.toFixed(0)),
      recommendation
    };
  } catch (error) {
    console.error('Error predicting inventory needs:', error);
    return null;
  }
}