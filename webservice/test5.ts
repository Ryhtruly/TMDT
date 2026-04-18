import { pool } from './src/config/db';
import { ShopRepository } from './src/repositories/shop.repository';
const shopRepo = new ShopRepository();

(async()=>{ 
  const client = await shopRepo.getTxClient(); 
  await client.query('BEGIN'); 
  const tx = await shopRepo.completeTopupTransaction(63480938, client); 
  if(tx){ 
    const w = await shopRepo.getWalletByUserId(tx.id_user); 
    if(w){ 
      await shopRepo.topupWallet(w.id_wallet, tx.amount, client); 
      console.log('MANUAL TOPUP SUCCESS'); 
    } 
  } 
  await client.query('COMMIT'); 
  client.release(); 
})().catch(console.error).finally(()=>pool.end());
