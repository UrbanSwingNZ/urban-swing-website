/**
 * Mock Firebase Admin SDK for testing
 */

// Mock Firestore document
class MockDocumentSnapshot {
  constructor(data, id = 'test-doc-id', exists = true) {
    this._data = data;
    this._id = id;
    this._exists = exists;
  }

  get id() {
    return this._id;
  }

  get exists() {
    return this._exists;
  }

  data() {
    return this._data;
  }
}

// Mock Firestore query snapshot
class MockQuerySnapshot {
  constructor(docs = []) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

// Mock Firestore query
class MockQuery {
  constructor(collectionPath, mockData = []) {
    this.collectionPath = collectionPath;
    this.mockData = mockData;
    this.whereClauses = [];
    this.orderByClauses = [];
    this.limitValue = null;
  }

  where(field, operator, value) {
    this.whereClauses.push({ field, operator, value });
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.orderByClauses.push({ field, direction });
    return this;
  }

  limit(limitValue) {
    this.limitValue = limitValue;
    return this;
  }

  async get() {
    // Apply where filters
    let filteredData = this.mockData.filter(doc => {
      return this.whereClauses.every(clause => {
        const docValue = doc.data[clause.field];
        switch (clause.operator) {
          case '==':
            return docValue === clause.value;
          case '!=':
            return docValue !== clause.value;
          case '>':
            return docValue > clause.value;
          case '>=':
            return docValue >= clause.value;
          case '<':
            return docValue < clause.value;
          case '<=':
            return docValue <= clause.value;
          default:
            return true;
        }
      });
    });

    // Apply orderBy
    if (this.orderByClauses.length > 0) {
      filteredData.sort((a, b) => {
        for (const clause of this.orderByClauses) {
          const aVal = a.data[clause.field];
          const bVal = b.data[clause.field];
          if (aVal < bVal) return clause.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return clause.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply limit
    if (this.limitValue) {
      filteredData = filteredData.slice(0, this.limitValue);
    }

    const docs = filteredData.map(
      doc => new MockDocumentSnapshot(doc.data, doc.id, true)
    );

    return new MockQuerySnapshot(docs);
  }
}

// Mock Firestore collection reference
class MockCollectionReference {
  constructor(collectionPath, mockData = {}) {
    this.collectionPath = collectionPath;
    this.mockData = mockData;
  }

  doc(docId) {
    return new MockDocumentReference(
      `${this.collectionPath}/${docId}`,
      docId,
      this.mockData[docId] || null
    );
  }

  where(field, operator, value) {
    const query = new MockQuery(this.collectionPath, this._convertMockDataToArray());
    return query.where(field, operator, value);
  }

  orderBy(field, direction = 'asc') {
    const query = new MockQuery(this.collectionPath, this._convertMockDataToArray());
    return query.orderBy(field, direction);
  }

  async get() {
    const docs = Object.entries(this.mockData).map(
      ([id, data]) => new MockDocumentSnapshot(data, id, true)
    );
    return new MockQuerySnapshot(docs);
  }

  _convertMockDataToArray() {
    return Object.entries(this.mockData).map(([id, data]) => ({
      id,
      data
    }));
  }
}

// Mock Firestore document reference
class MockDocumentReference {
  constructor(docPath, docId, mockData = null) {
    this.docPath = docPath;
    this.docId = docId;
    this.mockData = mockData;
  }

  async get() {
    if (this.mockData === null) {
      return new MockDocumentSnapshot(null, this.docId, false);
    }
    return new MockDocumentSnapshot(this.mockData, this.docId, true);
  }

  async set(data, options) {
    this.mockData = options?.merge ? { ...this.mockData, ...data } : data;
    return { writeTime: new Date() };
  }

  async update(data) {
    this.mockData = { ...this.mockData, ...data };
    return { writeTime: new Date() };
  }

  async delete() {
    this.mockData = null;
    return { writeTime: new Date() };
  }

  collection(collectionPath) {
    return new MockCollectionReference(`${this.docPath}/${collectionPath}`, {});
  }
}

// Mock Firestore
class MockFirestore {
  constructor(mockCollections = {}) {
    this.mockCollections = mockCollections;
  }

  collection(collectionPath) {
    return new MockCollectionReference(
      collectionPath,
      this.mockCollections[collectionPath] || {}
    );
  }

  doc(docPath) {
    const parts = docPath.split('/');
    const docId = parts[parts.length - 1];
    const collectionPath = parts.slice(0, -1).join('/');
    const collectionData = this.mockCollections[collectionPath] || {};
    return new MockDocumentReference(docPath, docId, collectionData[docId] || null);
  }

  // Helper to set mock data
  _setMockData(collectionPath, data) {
    this.mockCollections[collectionPath] = data;
  }
}

// Mock Firebase Admin
function createMockFirebaseAdmin(mockCollections = {}) {
  const mockFirestore = new MockFirestore(mockCollections);

  return {
    firestore: () => mockFirestore,
    auth: () => ({
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn()
    })
  };
}

module.exports = {
  createMockFirebaseAdmin,
  MockFirestore,
  MockDocumentSnapshot,
  MockQuerySnapshot,
  MockCollectionReference,
  MockDocumentReference
};
