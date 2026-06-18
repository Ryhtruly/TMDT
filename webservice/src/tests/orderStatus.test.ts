import { ORDER_STATUS, orderStatusEquals, orderStatusIn, orderStatusVariants } from '../utils/orderStatus';
import { DELIVERY_ATTEMPT_RESULT, deliveryAttemptResultVariants } from '../utils/orderStatus';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const waitingPickupVariants = orderStatusVariants(ORDER_STATUS.WAITING_PICKUP);
const atWarehouseVariants = orderStatusVariants(ORDER_STATUS.AT_WAREHOUSE);

assert(waitingPickupVariants.length >= 3, 'waiting pickup should include canonical and mojibake variants');
assert(orderStatusEquals(ORDER_STATUS.WAITING_PICKUP, ORDER_STATUS.WAITING_PICKUP), 'canonical status should match');
assert(orderStatusEquals(waitingPickupVariants[1], ORDER_STATUS.WAITING_PICKUP), 'single mojibake status should match');
assert(orderStatusEquals(waitingPickupVariants[2], ORDER_STATUS.WAITING_PICKUP), 'double mojibake status should match');
assert(orderStatusEquals('T?I KHO', ORDER_STATUS.AT_WAREHOUSE), 'legacy T?I KHO status should match');
assert(orderStatusIn(atWarehouseVariants[0], [ORDER_STATUS.PICKED_UP, ORDER_STATUS.AT_WAREHOUSE]), 'status set should match');
assert(!orderStatusEquals(ORDER_STATUS.DELIVERED, ORDER_STATUS.WAITING_PICKUP), 'different statuses should not match');

const deliverySuccessVariants = deliveryAttemptResultVariants(DELIVERY_ATTEMPT_RESULT.SUCCESS);
assert(deliverySuccessVariants.includes('THÃ€NH CÃ”NG'), 'delivery result should match cp1252 mojibake variant');

console.log('orderStatus normalization smoke test passed');

