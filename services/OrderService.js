const OrderModel = require('../models/OrderModel');
const { mapToDatabaseFormat } = require('../utils/mapper');

/**
 * Formata os dados de um pedido e seus itens para o padrão de resposta utilizado pela aplicação.
 *
 * Regras aplicadas:
 * - Converte `value` e `price` para número (float)
 * - Converte a data de criação (`creationdate`) para ISO string
 * - Padroniza os nomes dos campos para camelCase
 * - Monta o array de itens no formato esperado pelo Controller/API
 *
 * @param {object} orderRow - Linha retornada do banco representando o pedido.
 * @param {Array<object>} itemRows - Lista de linhas retornadas do banco representando os itens do pedido.
 * @returns {object} Objeto de pedido formatado com seus itens associados.
 */
const formatOrderResponse = (orderRow, itemRows) => {
    return {
        orderId: orderRow.orderid,
        value: parseFloat(orderRow.value),
        creationDate: orderRow.creationdate.toISOString(),
        items: itemRows.map(item => ({
            productId: item.productid,
            quantity: item.quantity,
            price: parseFloat(item.price),
        })),
    };
};

/**
 * Cria um novo pedido no banco de dados utilizando transação.
 *
 * Realiza o mapeamento dos dados recebidos para o formato esperado pelo banco,
 * inicia uma transação PostgreSQL, insere o pedido principal e seus itens,
 * e finaliza a operação com COMMIT. Em caso de falha em qualquer etapa,
 * a transação é revertida (ROLLBACK) para garantir integridade dos dados.
 *
 * Regras de negócio:
 * - A criação do pedido e de seus itens deve ser atômica (tudo ou nada)
 * - Mantém a consistência entre pedido e itens
 *
 * @param {object} inputBody - Dados brutos do pedido recebidos da camada Controller.
 * @returns {Promise<{orderId: string, data: object}>} Objeto contendo o ID do pedido criado e os dados mapeados.
 * @throws {Error} Caso ocorra erro em qualquer etapa da transação.
 */
const createOrder = async (inputBody) => {
    //Realizando mapping dos dados recebidos
    const mappedData = mapToDatabaseFormat(inputBody);
    
    const client = await OrderModel.pool.connect();
    
    try {
        // Iniciando para salvar no banco
        await client.query('BEGIN'); 

        await OrderModel.insertOrder(client, mappedData);

        for (const item of mappedData.items) {
            await OrderModel.insertOrderItem(client, mappedData.orderId, item);
        }

        // Caso todas sejam salvos realiza o commit no banco garantindo que a transação atomica foi salva
        await client.query('COMMIT'); 
        
        // Retorna os dados transformados e o ID
        return { 
            orderId: mappedData.orderId, 
            data: mappedData 
        };

    } catch (error) {
        // Caso dê algum erro volta todos os dados alterados ao estado inicial garantindo atomicidade na transação
        await client.query('ROLLBACK'); 
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Recupera os detalhes completos de um pedido, incluindo seu cabeçalho e os itens associados.
 *
 * @param {string} orderId - Identificador único do pedido que será consultado.
 * @returns {Promise<object|null>} Objeto contendo os dados do pedido e sua lista de itens, 
 *                                 ou `null` caso nenhum pedido seja encontrado.
 *  
 * @throws {ResourceNotFoundException} Lançada quando o pedido não existe.
 */
const getOrderDetails = async (orderId) => {
    const orderResult = await OrderModel.findOrderById(orderId);
    
    // Caso verifique que a quantidade de linhas retornadas do banco seja 0 lança a exception personalizada
    if (orderResult.rows.length === 0) {
        throw new ResourceNotFoundException("Pedido", orderId);
    }

    const orderRow = orderResult.rows[0];

    const itemsResult = await OrderModel.findItemsByOrderId(orderId);
    
    return formatOrderResponse(orderRow, itemsResult.rows); 
};

/**
 * Recupera todos os pedidos registrados no banco de dados e retorna uma lista
 * simplificada contendo apenas os campos essenciais mapeados na resposta.
 *
 * @returns {Promise<Array<{ orderId: string, value: number, creationDate: string }>>}
 * Uma lista de pedidos contendo ID, valor e data de criação.
 *
 * @throws {Error} Propaga qualquer erro ocorrido durante a consulta ao banco.
 */
const listAllOrders = async () => {
    const result = await OrderModel.findAllOrders();
    // Formata a lista para incluir apenas os campos principais
    return result.rows.map(order => ({
        orderId: order.orderid,
        value: parseFloat(order.value),
        creationDate: order.creationdate.toISOString(),
    }));
};


/**
 * Atualiza o cabeçalho de um pedido existente no banco de dados.
 *
 * Em caso de falha em qualquer etapa, a transação é revertida e o erro é propagado
 * para que o controller possa retornar o status HTTP adequado.
 *
 * @param {string} orderId - Identificador único do pedido que será atualizado.
 * @param {object} inputBody - Dados enviados pelo cliente contendo novas informações do pedido.
 *
 * @returns {Promise<boolean>} Retorna `true` quando a atualização ocorre com sucesso.
 *
 * @throws {ResourceNotFoundException} Lançada quando o pedido não existe.
 * @throws {Error} Qualquer falha de banco ou erro interno é propagada.
 */

const updateOrder = async (orderId, inputBody) => {
    //Realizando mapping dos dados recebidos
    const mappedData = mapToDatabaseFormat(inputBody);

    const client = await OrderModel.pool.connect();
    
    try {
        await client.query('BEGIN');

        const order = await OrderModel.findOrderById(orderId)

        if (order.rows.length === 0) {
            throw new ResourceNotFoundException("Pedido", orderId);
        }

        await OrderModel.updateOrderHeader(client, orderId, mappedData);

        await client.query('COMMIT');
        return true;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Atualiza um item específico de um pedido no banco de dados.
 *
 * Caso quantity ou price não sejam fornecidos, uma exceção é lançada imediatamente.
 * Em qualquer erro durante a atualização, a transação é revertida antes de propagar a exceção.
 *
 * @param {string} orderId - Identificador do pedido ao qual o item pertence.
 * @param {string} productId - Identificador do produto que será atualizado dentro do pedido.
 * @param {object} inputItemBody - Dados enviados pelo cliente contendo os novos valores do item.
 *
 * @returns {Promise<boolean>} `true` se o item foi atualizado, `false` se não houve alteração.
 *
 * @throws {ResourceNotFoundException} Lançada quando o pedido não existe.
 * @throws {Error} Quando os dados enviados são inválidos ou ocorre algum erro durante a transação.
 */

const updateItemOrder = async (orderId, productId, inputItemBody) => {
    const itemData = {
        quantity: inputItemBody.quantidadeItem || inputItemBody.quantity, // Aceita os dois formatos
        price: inputItemBody.valorItem || inputItemBody.price,
    };

    if (itemData.quantity === undefined || itemData.price === undefined) {
        throw new Error("Dados de atualização do item inválidos: 'quantidadeItem' ou 'valorItem' são obrigatórios.");
    }

    const orderResult = await OrderModel.findOrderById(orderId); 

    if (orderResult.rows.length === 0) {
        throw new ResourceNotFoundException("Pedido", orderId);
    }
    
    const client = await OrderModel.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const updateResult = await OrderModel.updateOrderItem(client, orderId, productId, itemData);

        if (updateResult.rowCount === 0) {
            // Se o pedido existe, mas a atualização não afetou linhas, o item não existe nesse pedido.
            throw new ResourceNotFoundException(`Item ${productId} no Pedido`, orderId);
        }

        await client.query('COMMIT');
        
        return updateResult.rowCount > 0;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Remove um pedido do banco de dados com base no seu identificador.
 *
 * A função delega ao OrderModel a exclusão do cabeçalho do pedido.  
 * Como a tabela de itens já deve estar configurada com ON DELETE CASCADE
 * (ou lógica equivalente no Model), não é necessário remover os itens manualmente.
 *
 * @param {string} orderId - Identificador único do pedido que será deletado.
 *
 * @returns {Promise<boolean>}
 * Retorna `true` se o pedido foi encontrado e removido, 
 * ou `false` caso nenhum registro tenha sido afetado.
 *
 * @throws {Error} Propaga erros provenientes da operação no banco de dados.
 */
const deleteOrder = async (orderId) => {
    const result = await OrderModel.deleteOrderHeader(orderId);
    if (result.rowCount === 0) throw new ResourceNotFoundException("Pedido", orderId);
};

module.exports = {
  createOrder,
  getOrderDetails,
  listAllOrders,
  updateOrder,
  deleteOrder,
  updateItemOrder
};