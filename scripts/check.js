const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, slug: true } });
  console.log('=== Products ===');
  products.forEach(function(p) { console.log(p.id + ' | name: ' + p.name + ' | slug: ' + p.slug); });
  
  const allSettings = await prisma.settings.findMany();
  console.log('=== All Settings Keys ===');
  allSettings.forEach(function(s) { console.log(s.key); });
  
  const sp = await prisma.settings.findUnique({ where: { key: 'shipping_prices' } });
  if (sp) {
    var p = JSON.parse(sp.value);
    console.log('shipping_prices count:', Object.keys(p).length);
    console.log('01:', JSON.stringify(p['01']));
  } else {
    console.log('No shipping_prices in DB');
  }
  
  const of = await prisma.settings.findUnique({ where: { key: 'offices' } });
  if (of) {
    console.log('offices:', of.value);
  } else {
    console.log('No offices in DB');
  }
  
  await prisma.$disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
