export interface CompiledPredicate {
  deployedAddress: string
  source: any
}

export interface InitilizationConfig {
  logicalConnectiveAddressTable: { [key: string]: string }
  atomicPredicateAddressTable: { [key: string]: string }
  deployedPredicateTable: { [key: string]: CompiledPredicate }
  constantVariableTable: { [key: string]: string }
  commitment: string
  adjudicationContract: string
  payoutContracts: { [key: string]: string }
  PlasmaETH: string
  utils: {
    utils: string
    deserializer: string
    ecrecover: string
  }
}
