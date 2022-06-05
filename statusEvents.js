let print = console.log
const time = require('dayjs')
var utc = require('dayjs/plugin/utc')
var timezone = require('dayjs/plugin/timezone')
time.extend(utc)
time.extend(timezone)

const env = require('node-env-file');
env(__dirname + '/.env');
const {APPWRITE_PROJECT, APPWRITE_KEY, APPWRITE_ENDPOINT, PRODUCTION, VERBOSE, SHOULD_LIMIT} = process.env


const sdk = require('node-appwrite');
const {Query} = sdk
const client = new sdk.Client();
client
    .setEndpoint(APPWRITE_ENDPOINT) // Your API Endpoint
    .setProject(APPWRITE_PROJECT) // Your project ID
    .setKey(APPWRITE_KEY); // Your secret API key
let db = new sdk.Database(client);
const HOUSE_COLLECTION_ID = '62942eb0a4f128287cbc'
const STATUS_EVENT_COLLECTION_ID = 'statusEvents'