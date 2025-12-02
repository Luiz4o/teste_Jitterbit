const express = require('express');
const router = express.Router();
const OrderController = require('../controller/OrderController');

router.get('/list', OrderController.listAllOrders);

router.post('/', OrderController.createNewOrder);

router.route('/:orderId')
    .get(OrderController.getOrder)
    .put(OrderController.updateExistingOrder)
    .delete(OrderController.deleteExistingOrder); 

router.put('/:orderId/item/:productId', OrderController.updateOrderItem);

module.exports = router;