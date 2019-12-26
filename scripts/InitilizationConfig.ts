export interface InitilizationConfig {
  logicalConnectiveAddressTable: { [key: string]: string }
  atomicPredicateAddressTable: { [key: string]: string }
  deployedPredicateTable: { deployedAddress: string; source: string }[]
  constantVariableTable: { [key: string]: string }
  commitmentContract: string
  adjudicationContract: string
  payoutContracts: { [key: string]: string }
  PlasmaETH: string
}
