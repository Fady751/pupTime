// Use require for JSON to guarantee it loads in React Native
const journal = require('./meta/_journal.json'); 
import m0000 from './0000_closed_wildside.sql';

export default {
  journal,
  migrations: {
    m0000
  }
}