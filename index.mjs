import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from 'fs';
import axios from 'axios';
import fetch from 'node-fetch';
import readline from 'readline';
import { default as UserAgent } from 'fake-useragent';

console.log("====================================");
console.log("       SolPot Auto Referral         ");
console.log("         @AirdropFamilyIDN          ");
console.log("====================================");

const newKeypair = Keypair.generate();
const newPrivateKeyBase58 = bs58.encode(newKeypair.secretKey);
const newPublicKeyBase58 = bs58.encode(newKeypair.publicKey.toBytes());

fs.appendFileSync('akun.txt', `Privatekey: ${newPrivateKeyBase58}\nAddress: ${newPublicKeyBase58}\n`);

async function getNonce(publicKey) {
    const userAgent = new UserAgent();
    const response = await fetch('https://solpot.com/api/auth/nonce', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': userAgent
        },
        body: JSON.stringify({ publicKey }),
        timeout: 10000
    });

    if (!response.ok) {
        throw new Error('Failed to fetch nonce');
    }

    const data = await response.json();
    return data.data.nonce;
}

async function verifySignature(publicKey, nonce, signatureArray) {
    const userAgent = new UserAgent();
    try {
        const response = await fetch('https://solpot.com/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': userAgent
            },
            body: JSON.stringify({
                publicKey,
                nonce,
                signature: signatureArray
            })
        });

        if (!response.ok) {
            throw new Error('Failed to verify signature');
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error during signature verification:', error);
        throw error;
    }
}

async function createUser(name, tos, referralCode, nonce, publicKey, signatureArray) {
    const userAgent = new UserAgent();
    const response = await fetch('https://solpot.com/api/auth/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': userAgent
        },
        body: JSON.stringify({
            name,
            tos,
            referralCode,
            nonce,
            publicKey,
            signature: signatureArray
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create user:', errorData);
        throw new Error('Failed to create user');
    }

    const data = await response.json();
    return data;
}

async function getRandomUsername() {
    try {
        const userAgent = new UserAgent();
        const response = await axios.get('https://api.randomuser.me/', {
            timeout: 5000,
            headers: {
                'User-Agent': userAgent
            }
        });
        return response.data.results[0].login.username;
    } catch (error) {
        throw new Error('Failed to fetch random username');
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Masukkan jumlah Reff : ', (iterasiInput) => {
    const jumlahIterasi = parseInt(iterasiInput, 10);

    if (isNaN(jumlahIterasi) || jumlahIterasi <= 0) {
        console.error("Jumlah iterasi harus berupa angka positif.");
        rl.close();
        return;
    }

    rl.question('Masukkan kode referral : ', async (referralCode) => {
        for (let i = 0; i < jumlahIterasi; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log(`Proses Referral Ke: ${i + 1}/${jumlahIterasi}`);

            const newKeypair = Keypair.generate();
            const newPrivateKeyBase58 = bs58.encode(newKeypair.secretKey);
            const newPublicKeyBase58 = bs58.encode(newKeypair.publicKey.toBytes());

            fs.appendFileSync('akun.txt', `Privatekey: ${newPrivateKeyBase58}\nAddress: ${newPublicKeyBase58}\n`);

            try {
                const publicKeyBase58 = newPublicKeyBase58;
                const nonce = await getNonce(publicKeyBase58);

                const message = new TextEncoder().encode(`Welcome to SolPot!
This request will not trigger a blockchain transaction or cost any gas fees. 

Wallet address: ${publicKeyBase58}
Nonce: ${nonce}`);

                const signature = nacl.sign.detached(message, newKeypair.secretKey);

                const signatureArray = Array.from(signature);

                const randomUsername = await getRandomUsername();

                const verified = nacl.sign.detached.verify(
                    new Uint8Array(message),
                    signature,
                    new Uint8Array(newKeypair.publicKey.toBytes())
                );
                console.log(`Mencoba Register :`, verified);

                const isVerified = await verifySignature(publicKeyBase58, nonce, signatureArray);
                console.log(`Register Verified:`, isVerified);

                const createUserResponse = await createUser(
                    randomUsername,
                    true,
                    referralCode,
                    nonce,
                    publicKeyBase58,
                    signatureArray
                );

                if (createUserResponse.data && createUserResponse.data.user) {
                    const userData = createUserResponse.data.user;
                    console.log("Register Success");
                    console.log("Name   :", userData.name);
                    console.log("Address:", userData.publicKey);
                    console.log("============================");
                } else {
                    console.error("Error: User data is undefined");
                }

            } catch (error) {
                console.error("Error:", error);
            }
        }
        rl.close();
    });
});
