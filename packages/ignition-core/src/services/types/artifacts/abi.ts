export interface JsonFragmentType {
  name: string;
  indexed?: boolean;
  type: string;
  internalType?: string;
  components?: JsonFragmentType[];
}

export interface JsonFragment {
  name?: string;
  type?: string;

  anonymous?: boolean;

  payable?: boolean;
  constant?: boolean;
  stateMutability?: string;

  inputs?: JsonFragmentType[];
  outputs?: JsonFragmentType[];

  gas?: string;
}
