/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */
require("dotenv").config();

if (!process.env.PRIVATE_KEY) {
    throw new Error("define PRIVATE_KEY in .env first!");
} else {
    console.log("Using env var PRIVATE_KEY", `${process.env.PRIVATE_KEY.substr(0, 4)}...`);
}
if (process.env.INFURA_APIKEY) {
    console.log("Using env var INFURA_APIKEY", `${process.env.INFURA_APIKEY.substr(0, 4)}...`);
}
if (process.env.PRIVATE_NETWORK_URL) {
    console.log("Using env var PRIVATE_NETWORK", process.env.PRIVATE_NETWORK_URL);
}
if (process.env.PRIVATE_NETWORK_ID) {
    console.log("Using env var PRIVATE_NETWORK_ID", process.env.PRIVATE_NETWORK_ID);
}

module.exports = {
    /**
     * Networks define how you connect to your ethereum client and let you set the
     * defaults web3 uses to send transactions. If you don't specify one truffle
     * will spin up a development blockchain for you on port 9545 when you
     * run `develop` or `test`. You can ask a truffle command to use a specific
     * network from the command line, e.g
     *
     * $ truffle test --network <network-name>
     */
    networks: {
        // Useful for testing. The `development` name is special - truffle uses it by default
        // if it's defined here and no other network is specified at the command line.
        // You should run a client (like ganache-cli, geth or parity) in a separate terminal
        // tab if you use this network and you must also set the `host`, `port` and `network_id`
        // options below to some value.
        development: {
            host: "localhost",
            port: 8545,
            gas: 6700000,
            network_id: "31337",
        },
    },
    // Set default mocha options here, use special reporters etc.
    mocha: {},
    compilers: {
        solc: {
            version: "0.5.2",
            docker: false,
            settings: {
                optimizer: {
                    enabled: false,
                    runs: 200
                },
            }
        }
    }
};
