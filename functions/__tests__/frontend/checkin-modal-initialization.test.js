const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.style = { display: 'none', opacity: '1' };
    this.textContent = '';
    this.innerHTML = '';
    this.parentElement = { style: { opacity: '1' } };
    this.listeners = {};
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatchEvent(event) {
    if (this.listeners[event.type]) {
      this.listeners[event.type](event);
    }
  }
}

describe('check-in modal default selection initialization', () => {
  let context;
  let paymentSection;
  let casualRadio;
  let radioInputs;

  beforeEach(() => {
    const ids = [
      'selected-student-info',
      'selected-student-name',
      'selected-student-email',
      'selected-student-id',
      'payment-section',
      'payment-method',
      'free-entry-section',
      'free-entry-reason',
      'checkin-notes',
      'confirm-checkin-btn',
      'membership-info',
      'concession-info',
      'concession-balance',
      'concession-blocks',
      'membership-header',
      'membership-details',
      'modal-student-search',
      'modal-search-results',
      'entry-membership',
      'entry-concession',
      'entry-casual',
      'entry-casual-student',
      'entry-online-payment',
      'entry-free',
    ];

    const elements = new Map();
    ids.forEach((id) => elements.set(id, new MockElement(id)));

    const paymentMethod = elements.get('payment-method');
    paymentMethod.value = '';

    const membershipRadio = elements.get('entry-membership');
    membershipRadio.name = 'entry-type';
    membershipRadio.value = 'membership';

    const concessionRadio = elements.get('entry-concession');
    concessionRadio.name = 'entry-type';
    concessionRadio.value = 'concession';

    casualRadio = elements.get('entry-casual');
    casualRadio.name = 'entry-type';
    casualRadio.value = 'casual';

    const casualStudentRadio = elements.get('entry-casual-student');
    casualStudentRadio.name = 'entry-type';
    casualStudentRadio.value = 'casual-student';

    const onlinePaymentRadio = elements.get('entry-online-payment');
    onlinePaymentRadio.name = 'entry-type';
    onlinePaymentRadio.value = 'online-payment';

    const freeRadio = elements.get('entry-free');
    freeRadio.name = 'entry-type';
    freeRadio.value = 'free';

    radioInputs = [
      membershipRadio,
      concessionRadio,
      casualRadio,
      casualStudentRadio,
      onlinePaymentRadio,
      freeRadio,
    ];

    paymentSection = elements.get('payment-section');

    context = {
      document: {
        getElementById: (id) => elements.get(id),
        querySelectorAll: (selector) => (selector === 'input[name="entry-type"]' ? radioInputs : []),
        querySelector: (selector) => {
          if (selector === 'input[name="entry-type"][value="casual"]') return casualRadio;
          return null;
        },
      },
      window: {
        checkStudentMembership: jest.fn().mockResolvedValue({
          isImprover: false,
          hasActiveMembership: false,
        }),
        showSnackbar: jest.fn(),
      },
      console,
      getSelectedCheckinDate: () => new Date('2026-01-01'),
      isEditMode: () => false,
      getStudentFullName: (student) => `${student.firstName} ${student.lastName}`,
      getConcessionData: jest.fn().mockResolvedValue({
        totalBalance: 0,
        expiredBalance: 0,
        blocks: [],
      }),
      setSelectedStudent: jest.fn(),
      getSelectedStudent: jest.fn(() => ({
        id: 'stu-1',
        firstName: 'Liza',
        lastName: 'Test',
        email: 'liza@example.com',
      })),
      formatDate: () => 'Jan 1, 2026',
      formatCurrency: () => '$15',
      firebase: { firestore: jest.fn() },
      Event: function Event(type) { this.type = type; },
    };

    context.window.document = context.document;

    const scriptPath = path.join(__dirname, '../../../admin/check-in/js/checkin-form.js');
    const concessionScriptPath = path.join(__dirname, '../../../admin/check-in/js/checkin-concession-display.js');

    vm.createContext(context);
    vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);
    vm.runInContext(fs.readFileSync(concessionScriptPath, 'utf8'), context);
  });

  it('shows the payment method section when the default casual radio is selected on initial load', async () => {
    const student = {
      id: 'stu-1',
      firstName: 'Liza',
      lastName: 'Test',
      email: 'liza@example.com',
    };

    await context.showSelectedStudent(student);

    expect(casualRadio.checked).toBe(true);
    expect(paymentSection.style.display).toBe('block');
  });
});
