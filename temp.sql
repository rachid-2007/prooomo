SELECT o.id, o.status, osh."newStatus" FROM "Order" o JOIN "OrderStatusHistory" osh ON o.id = osh."orderId" ORDER BY o."createdAt" DESC LIMIT 20;
