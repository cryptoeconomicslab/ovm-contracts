export interface CompiledPredicate {
  deployedAddress: string
  source: string
}

export interface InitilizationConfig {
  logicalConnectiveAddressTable: { [key: string]: string }
  atomicPredicateAddressTable: { [key: string]: string }
  deployedPredicateTable: { [key: string]: CompiledPredicate }
  constantVariableTable: { [key: string]: string }
  commitmentContract: string
  adjudicationContract: string
  payoutContracts: { [key: string]: string }
  PlasmaETH: string
}
