export interface JsonFragmentType {
  name?: string;
  indexed?: boolean;
  type?: string;
  internalType?: string;
  components?: Array<JsonFragmentType>;
}

export interface JsonFragment {
  name?: string;
  type?: string;

  anonymous?: boolean;

  payable?: boolean;
  constant?: boolean;
  stateMutability?: string;

  inputs?: Array<JsonFragmentType>;
  outputs?: Array<JsonFragmentType>;

  gas?: string;
}
