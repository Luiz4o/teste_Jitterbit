/**
 * Transforma o JSON de entrada para o JSON de saída (Banco de Dados).
 * @param {object} inputOrder - O objeto do pedido no formato de entrada.
 * @returns {object} O objeto do pedido transformado para o formato do BD.
 */
const mapToDatabaseFormat = (inputOrder) => {
  // Ajuste do numeroPedido para orderId (removendo a parte '-01' se existir)
  const orderId = inputOrder.numeroPedido.split('-')[0];

  // Ajuste da data: a data de entrada pode ter um formato estendido (+00:00),
  // garantimos que o formato ISO seja preservado, usando 'Z' para UTC.
  const creationDate = new Date(inputOrder.dataCriacao).toISOString();

  const transformedItems = inputOrder.items.map(item => ({
    productId: parseInt(item.idItem, 10),
    quantity: item.quantidadeItem,
    price: item.valorItem,
  }));

  return {
    orderId: orderId,
    value: inputOrder.valorTotal,
    creationDate: creationDate,
    items: transformedItems,
  };
};

module.exports = {
  mapToDatabaseFormat,
};