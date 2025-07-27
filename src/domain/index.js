/**
 * Domain Layer Index
 * ドメイン層の統一エクスポート
 */

// Export all entities
const entities = require('./entities')
const valueObjects = require('./valueObjects')
const services = require('./services')

module.exports = {
  // Entities
  ...entities,
  
  // Value Objects  
  ...valueObjects,
  
  // Services
  ...services
}