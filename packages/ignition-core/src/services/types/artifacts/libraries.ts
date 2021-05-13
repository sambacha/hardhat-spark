export interface LinkReferences {
  [contractName: string]: SingleContractLinkReference;
}

export interface SingleContractLinkReference {
  [libraryName: string]: Array<{ length: number; start: number }>;
}
