import assert from 'node:assert/strict';
import { db } from '../src/db/database.js';

assert.equal(typeof db.getMongoStatus, 'function', 'Database exposes Mongo status helper');
console.log('Mongo status:', db.getMongoStatus());
console.log('Mongo test passed');
