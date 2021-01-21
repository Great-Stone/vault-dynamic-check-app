const config = require("../config");
let vaultoption = {
    apiVersion: "v1",
    endpoint: config.vault.endpoint,
};
let VaultSDK = require("node-vault")(vaultoption);
const { Client } = require("@elastic/elasticsearch");

const vaultLogin = async (callback) => {
    const username = config.vault.id;
    const password = config.vault.pw;
    VaultSDK.userpassLogin({ username, password })
        .then((result) => {
            callback(VaultSDK);
        })
        .catch((err) => console.error(err.message));
};

let client;
let connSecret;
let lease_id;

const newSecret = async (callback) => {
    vaultLogin((vault_client) => {
        vault_client
            .read("elastic/creds/elastic-1h-role")
            .then((secret) => {
                callback(secret);
            })
            .catch((err) => console.error(err.message));
    });
};

const init = async () => {
    newSecret((secret) => {
        console.log(`elastic init secret user: ${secret.data.username}`);
        console.log(`elastic init secret pass: ${secret.data.password}`);
        lease_id = secret.lease_id;
        connSecret = secret;
        const username = secret.data.username;
        const password = secret.data.password;

        client = new Client({
            node: {
                url: new URL(config.elastic.url),
                auth: {
                    username: username,
                    password: password,
                },
            },
        });
    });
};

init();

const renewal = async () => {
    vaultLogin((vault_client) => {
        vault_client
            .renew({ lease_id: lease_id })
            .then((result) => {
                console.log(result);
            })
            .catch((err) => console.error(err.message));
    });
};

setInterval(renewal, 30 * 60 * 1000); // renewel
setInterval(init, 23 * 60 * 60 * 1000); // recreate

const query = async (sql, callback) => {
    try {
        const result = await client.search(sql);
        let data = {
            secret: connSecret,
            result: result,
        };
        callback(data);
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

module.exports = {
    newSecret: newSecret,
    query: query,
};
