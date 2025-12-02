const { query, pool } = require('../config/db');

module.exports.pool = pool;

const insertOrder = (client, orderData) => {
    const orderSql = `
      INSERT INTO Orders (orderId, value, creationDate)
      VALUES ($1, $2, $3);
    `;
    return client.query(orderSql, [
        orderData.orderId, 
        orderData.value, 
        orderData.creationDate
    ]);
};

const insertOrderItem = (client, orderId, item) => {
    const itemSql = `
      INSERT INTO Items (orderId, productId, quantity, price)
      VALUES ($1, $2, $3, $4);
    `;
    return client.query(itemSql, [
        orderId, 
        item.productId, 
        item.quantity, 
        item.price
    ]);
};

const findOrderById = (orderId) => {
    return query('SELECT orderId, value, creationDate FROM Orders WHERE orderId = $1;', [orderId]);
};

const findItemsByOrderId = (orderId) => {
    return query('SELECT productId, quantity, price FROM Items WHERE orderId = $1;', [orderId]);
};

const findAllOrders = () => {
    return query('SELECT orderId, value, creationDate FROM Orders ORDER BY creationDate DESC;');
};

const updateOrderHeader = (client, orderId, orderData) => {
    const updateOrderSql = `
      UPDATE Orders
      SET value = $1, creationDate = $2
      WHERE orderId = $3
      RETURNING orderId;
    `;
    return client.query(updateOrderSql, [
        orderData.value,
        orderData.creationDate,
        orderId
    ]);
};

const updateOrderItem = (client, orderId, productId, itemData) => {
    const updateItemSql = `
      UPDATE Items
      SET quantity = $1, price = $2
      WHERE orderId = $3 AND productId = $4
      RETURNING itemId;
    `;
    return client.query(updateItemSql, [
        itemData.quantity,
        itemData.price,
        orderId,
        productId
    ]);
};

const deleteOrderItems = (client, orderId) => {
    return client.query('DELETE FROM Items WHERE orderId = $1;', [orderId]);
};

const deleteOrderHeader = (orderId) => {
    return query('DELETE FROM Orders WHERE orderId = $1;', [orderId]);
};


module.exports = {
  pool: pool,
  insertOrder,
  insertOrderItem,
  findOrderById,
  findItemsByOrderId,
  findAllOrders,
  updateOrderHeader,
  deleteOrderItems,
  deleteOrderHeader,
  updateOrderItem
};