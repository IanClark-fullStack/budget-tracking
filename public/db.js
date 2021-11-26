// Handle Network Offline 

// const { post } = require("../routes/api");



// Global variables initialized to value of null provide a way to dynamically change the current database and most current version. 
let db;
let currentVersion; 

// Make an Open Indexed DB Request, either current Version or N
const request = indexedDB.open('BudgetDB', currentVersion || 21); 

request.onupgradeneeded = function (e) {
    console.log('Upgrade is needed on Indexed DB');
    const { lastVersion } = e;
    const newVersion = e.newVersion || db.version;
    console.log(`Upgraded from ${lastVersion} to ${newVersion} successfully`);

    db = e.target.result;

    // Check if an object store already exists on the database
    if (db.objectStoreNames.length === 0) {
        db.createObjectStore('BudgetStore', { autoIncrement: true });
    } 
};

// Error Handling 
request.onerror = function (e) {
    console.log(`Attempt Failed. ${e.target.errorCode}`);
};

// Define the functionality for Saving data when the API route Fails 
const checkDb = () => {
    // open transaction on the object store, with read and write privledges 
    let transaction = db.transaction(['BudgetStore'], 'readwrite');
    // create a reference to the object store by reading into the existing 
    const store = transaction.objectStore('BudgetStore');
    // get all records saved, 
    const getAllRecords = store.getAll();
        // on success, 
        getAllRecords.onsuccess = function () {
             // if items exist, add all of the them using fetch POST method to the API route defined when the network comes back online.
            if (getAllRecords.result.length > 0) {
                fetch('/api/transaction/bulk', {
                    method: 'POST', 
                    body: JSON.stringify(getAllRecords.result), 
                    headers: {
                        Accept: 'application/json, text/plain, */*',
                        'Content-Type': 'application/json',
                    },
                })
                then((response) => response.json())
                then((res) => {
                    // In the case we have something other than empty
                    if (res.length !== 0) {
                        transaction = db.transaction(['BudgetStore'], 'readwrite');
                        const currentStore = transaction.objectStore('BudgetStore');
                        currentStore.clear();
                        console.log('Existing entries are cleared');
                    }
                })
            }
        }
};

// Success Handling 
request.onsuccess = function (e) {
    console.log('Found a success');
    // Change the value of db to the most current version 
    db = e.target.result
    // Network Handling - To prevent reading into the database while offline
    if (navigator.onLine) {
        console.log('Connected to Backend');
        // Call on Check Database 
        checkDb();
    }
};

// Handling Failure to Add to the Database
const saveRecord = (record) => {
    const transaction = db.transaction(['BudgetStore'], 'readwrite');
    // Access your BudgetStore object store
    const store = transaction.objectStore('BudgetStore');
    // Add record to your store with add method.
    store.add(record);
};

// Network Handling 
window.addEventListener('online', checkDb);