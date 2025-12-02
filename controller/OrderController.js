const OrderService = require('../services/OrderService');

// Código de erro PostgreSQL para IDs duplicados
const PG_DUPLICATE_KEY_CODE = '23505'; 

/**
 * Cria um novo pedido no sistema.
 * 
 * Códigos de resposta:
 * - 201: Pedido criado com sucesso
 * - 400: Dados inválidos ou faltantes
 * - 409: orderId já existente (violação de chave única)
 * - 500: Erro interno do servidor
 * 
 * @param {Request} req - Objeto de requisição HTTP contendo os dados do pedido.
 * @param {Response} res - Objeto de resposta HTTP para envio ao cliente.
 * @returns {Response} JSON com confirmação de criação ou erro.
 */
const createNewOrder = async (req, res) => {
  try {
    const result = await OrderService.createOrder(req.body);

    return res.status(201).json({
      message: 'Pedido criado com sucesso.',
      orderId: result.orderId,
      data: result.data,
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    // Verificando se o erro informado coincide com Ids duplicados do Postgre
    if (error.code === PG_DUPLICATE_KEY_CODE) { 
        // 409 Conflict: Pedido com o mesmo orderId já existe
        return res.status(409).json({ 
            message: 'Erro: O número de pedido já existe.',
            error: error.message
        });
    }
    if (error.message && error.message.includes('inválidos')) {
        return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({
      message: 'Erro interno do servidor ao criar o pedido.',
      error: error.message,
    });
  }
};

/**
 * Recupera os detalhes de um pedido específico com base no orderId informado.
 * 
 * Códigos de resposta:
 * - 200: Pedido encontrado e retornado com sucesso
 * - 404: Nenhum pedido encontrado com o orderId informado
 * - 500: Erro interno do servidor ao processar a busca
 * 
 * @param {import('express').Request} req - Objeto da requisição HTTP contendo o orderId nos parâmetros da rota.
 * @param {import('express').Response} res - Objeto da resposta HTTP para retornar o resultado da operação.
 * @returns {Promise<import('express').Response>} Resposta HTTP com o pedido encontrado ou mensagem de erro.
 */
const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await OrderService.getOrderDetails(orderId);

    if (!order) {
      return res.status(404).json({
        message: `Pedido com orderId ${orderId} não encontrado.`,
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor ao buscar o pedido.',
      error: error.message,
    });
  }
};

/**
 * Lista todos os pedidos cadastrados no sistema.
 *
 *
 * Códigos de resposta:
 * - 200: Lista de pedidos retornada com sucesso
 * - 500: Erro interno ao tentar listar os pedidos
 *
 * @param {import('express').Request} req - Objeto da requisição HTTP.
 * @param {import('express').Response} res - Objeto da resposta HTTP usado para enviar a lista de pedidos.
 * @returns {Promise<import('express').Response>} Resposta contendo a lista de pedidos ou mensagem de erro.
 */
const listAllOrders = async (req, res) => {
  try {
    const orders = await OrderService.listAllOrders();
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor ao listar os pedidos.',
      error: error.message,
    });
  }
};

/**
 * Atualiza um pedido existente com base no orderId fornecido.
 *
 * Códigos de resposta:
 * - 200: Pedido atualizado com sucesso
 * - 400: Dados inválidos ou ausentes no corpo da requisição
 * - 404: Pedido não encontrado para atualização
 * - 500: Erro interno ao processar a atualização
 *
 * @param {import('express').Request} req - Requisição HTTP contendo o orderId nos parâmetros e os dados no corpo.
 * @param {import('express').Response} res - Resposta HTTP enviada ao cliente.
 * @returns {Promise<import('express').Response>} Resultado da atualização do pedido.
 */
const updateExistingOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        await OrderService.updateOrderHeaderOnly(orderId, req.body);

        return res.status(200).json({
            message: `Cabeçalho do Pedido ${orderId} atualizado com sucesso.`,
        });

    } catch (error) {
        console.error('Erro ao atualizar cabeçalho do pedido:', error);
        if (error instanceof ResourceNotFoundException) {
            return res.status(error.statusCode).json({
                message: error.message,
            });
        }
        
        if (error.message && error.message.includes('inválidos')) {
            return res.status(400).json({ message: error.message });
        }
        
        return res.status(500).json({
            message: 'Erro interno do servidor ao atualizar o cabeçalho.',
            error: error.message,
        });
    }
};

/**
 * Atualiza um item específico de um pedido existente.
 *
 * Possíveis respostas:
 * - 200: Item atualizado com sucesso.
 * - 400: Dados inválidos ou `productId` não numérico.
 * - 404: Pedido ou item não encontrado.
 * - 500: Erro interno no servidor.
 *
 * @param {import('express').Request} req - Requisição HTTP contendo parâmetros e payload do item.
 * @param {import('express').Response} res - Objeto de resposta HTTP utilizado para retornar o resultado ao cliente.
 *
 * @returns {Promise<import('express').Response>} Resposta HTTP indicando sucesso ou erro.
 */
const updateOrderItem = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        
        // Converte productId para o formato esperado (Integer)
        const numericProductId = parseInt(productId, 10);
        if (isNaN(numericProductId)) {
            return res.status(400).json({ message: "O ID do produto deve ser um número válido." });
        }
        
        await OrderService.updateItemOrder(orderId, numericProductId, req.body); 

        return res.status(200).json({
            message: `Item ${productId} do Pedido ${orderId} atualizado com sucesso.`,
        });

    } catch (error) {
        console.error('Erro ao atualizar item do pedido:', error);
        if (error instanceof ResourceNotFoundException) {
            return res.status(404).json({
                message: error.message,
            });
        }
        
        if (error.message && error.message.includes('inválidos')) {
            return res.status(400).json({ message: error.message });
        }
        
        return res.status(500).json({
            message: 'Erro interno do servidor ao atualizar o item.',
            error: error.message,
        });
    }
};

/**
 * Remove um pedido do sistema com base no orderId informado.
 *
 * Códigos de resposta:
 * - 204: Pedido removido com sucesso
 * - 404: Pedido não encontrado para exclusão
 * - 500: Erro interno durante a exclusão
 *
 * @param {import('express').Request} req - Objeto da requisição HTTP contendo o orderId nos parâmetros.
 * @param {import('express').Response} res - Objeto da resposta HTTP usado para retornar o resultado ao cliente.
 * @returns {Promise<import('express').Response>} Resposta HTTP indicando sucesso ou erro.
 */
const deleteExistingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    await OrderService.deleteOrder(orderId);

    return res.status(204).send();

  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return res.status(404).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Erro interno do servidor ao deletar o pedido.",
      error: error.message,
    });
  }
};


module.exports = {
  createNewOrder,
  getOrder,
  listAllOrders,
  updateExistingOrder,
  deleteExistingOrder,
  updateOrderItem
};