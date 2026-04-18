import { pool } from './src/config/db';
import { ShopRepository } from './src/repositories/shop.repository';
const shopRepo = new ShopRepository();

(async()=>{ 
  const client = await shopRepo.getTxClient(); 
  await client.query('BEGIN'); 
  const tx = await shopRepo.completeTopupTransaction(63480938, client); 
  console.log('TX:', tx); 
  
  if(tx){ 
    const w = await shopRepo.getWalletByUserId(tx.id_user); 
    console.log('Wallet_id_user:', tx.id_user, '=> result:', w); 
    if(w){ 
      await shopRepo.topupWallet(w.id_wallet, tx.amount, client); 
      console.log('Topped up'); 
    } else {
      console.log('WALLET NOT FOUND for user:', tx.id_user);
    }
  } else {
    console.log('TRANSACTION MATCH FAILED.');
  }
  
  await client.query('ROLLBACK'); 
  client.release(); 
})().catch(console.error).finally(()=>pool.end());
