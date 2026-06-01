export const recommendationStrategyLabel = (strategy?: string) => {
  switch (strategy) {
    case 'personalized_cf_behavior':
      return 'Personalized: Behavior + Collaborative Filtering'
    case 'personalized_behavior_recent':
      return 'Personalized: Recent activity'
    case 'hybrid_cf_cold_start':
      return 'Hybrid: Collaborative Filtering + Cold Start'
    case 'hybrid_behavior_cold_start':
      return 'Hybrid: Recent activity + Cold Start'
    case 'hybrid_offline_cold_start':
      return 'Hybrid: Offline recommendations + Cold Start'
    case 'cold_start_best_seller_newest':
      return 'Best Sellers + New Arrivals'
    default:
      return 'Product recommendations'
  }
}
