import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  Initialized,
  OrderPlaced,
  OrderSettled,
  OwnershipTransferred,
  Upgraded,
  feeSet,
  oracleSet
} from "../generated/ExchangeV1/ExchangeV1"

export function createInitializedEvent(version: BigInt): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version)
    )
  )

  return initializedEvent
}

export function createOrderPlacedEvent(
  trader: Address,
  from: Address,
  to: Address,
  fromAmount: BigInt,
  fromTokenPrice: BigInt,
  toTokenPrice: BigInt
): OrderPlaced {
  let orderPlacedEvent = changetype<OrderPlaced>(newMockEvent())

  orderPlacedEvent.parameters = new Array()

  orderPlacedEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  orderPlacedEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  orderPlacedEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  orderPlacedEvent.parameters.push(
    new ethereum.EventParam(
      "fromAmount",
      ethereum.Value.fromUnsignedBigInt(fromAmount)
    )
  )
  orderPlacedEvent.parameters.push(
    new ethereum.EventParam(
      "fromTokenPrice",
      ethereum.Value.fromSignedBigInt(fromTokenPrice)
    )
  )
  orderPlacedEvent.parameters.push(
    new ethereum.EventParam(
      "toTokenPrice",
      ethereum.Value.fromSignedBigInt(toTokenPrice)
    )
  )

  return orderPlacedEvent
}

export function createOrderSettledEvent(
  trader: Address,
  from: Address,
  to: Address,
  fromAmount: BigInt,
  toAmount: BigInt,
  fromTokenPrice: BigInt,
  toTokenPrice: BigInt,
  feeAmount: BigInt
): OrderSettled {
  let orderSettledEvent = changetype<OrderSettled>(newMockEvent())

  orderSettledEvent.parameters = new Array()

  orderSettledEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam(
      "fromAmount",
      ethereum.Value.fromUnsignedBigInt(fromAmount)
    )
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam(
      "toAmount",
      ethereum.Value.fromUnsignedBigInt(toAmount)
    )
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam(
      "fromTokenPrice",
      ethereum.Value.fromSignedBigInt(fromTokenPrice)
    )
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam(
      "toTokenPrice",
      ethereum.Value.fromSignedBigInt(toTokenPrice)
    )
  )
  orderSettledEvent.parameters.push(
    new ethereum.EventParam(
      "feeAmount",
      ethereum.Value.fromUnsignedBigInt(feeAmount)
    )
  )

  return orderSettledEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createUpgradedEvent(implementation: Address): Upgraded {
  let upgradedEvent = changetype<Upgraded>(newMockEvent())

  upgradedEvent.parameters = new Array()

  upgradedEvent.parameters.push(
    new ethereum.EventParam(
      "implementation",
      ethereum.Value.fromAddress(implementation)
    )
  )

  return upgradedEvent
}

export function createfeeSetEvent(
  from: Address,
  to: Address,
  fee: i32
): feeSet {
  let feeSetEvent = changetype<feeSet>(newMockEvent())

  feeSetEvent.parameters = new Array()

  feeSetEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  feeSetEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  feeSetEvent.parameters.push(
    new ethereum.EventParam(
      "fee",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(fee))
    )
  )

  return feeSetEvent
}

export function createoracleSetEvent(
  asset: Address,
  oracle: Address
): oracleSet {
  let oracleSetEvent = changetype<oracleSet>(newMockEvent())

  oracleSetEvent.parameters = new Array()

  oracleSetEvent.parameters.push(
    new ethereum.EventParam("asset", ethereum.Value.fromAddress(asset))
  )
  oracleSetEvent.parameters.push(
    new ethereum.EventParam("oracle", ethereum.Value.fromAddress(oracle))
  )

  return oracleSetEvent
}
