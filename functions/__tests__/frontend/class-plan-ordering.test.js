const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('Level 1 class plan ordering', () => {
  let context;
  let cards;
  let settings;
  let plans;
  let emptyState;

  beforeEach(() => {
    jest.useFakeTimers();
    cards = [];
    settings = {
      blockSize: 12,
      cycleStartDate: { toDate: () => new Date(2026, 5, 4) },
    };
    plans = [];
    emptyState = { style: { display: 'block' } };
    const container = {
      querySelectorAll: () => [...cards],
      appendChild: (card) => cards.push(card),
    };
    const query = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: async () => ({
        forEach: (callback) => plans.forEach((plan) => callback({
          id: `week-${plan.cycleWeek}`,
          data: () => ({ ...plan }),
        })),
      }),
    };
    context = {
      Date,
      console,
      document: {
        addEventListener: jest.fn(),
        getElementById: (id) => id === 'level1-plans-container' ? container : emptyState,
        querySelector: () => null,
        createElement: () => {
          const card = {
            className: '',
            innerHTML: '',
            classList: { add: jest.fn() },
            remove: () => cards.splice(cards.indexOf(card), 1),
          };
          return card;
        },
      },
      window: {
        db: {
          collection: (name) => name === 'settings' ? {
            doc: () => ({
              get: async () => ({ exists: true, data: () => settings }),
            }),
          } : query,
        },
        showSnackbar: jest.fn(),
      },
    };
    const scriptPath = path.join(__dirname, '../../../admin/class-plan/class-plan.js');
    const source = fs.readFileSync(scriptPath, 'utf8')
      .replace(/^import .*;\r?\n/gm, '');
    vm.createContext(context);
    vm.runInContext(source, context);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function displayedWeeks() {
    return cards.map((card) => Number(card.innerHTML.match(/Week (\d+) of/)[1]));
  }

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    'starts with Week %i and displays every week once in cyclic order',
    async (currentWeek) => {
      jest.setSystemTime(new Date(2026, 5, 1 + (currentWeek - 1) * 7, 12));
      plans = [{ cycleWeek: currentWeek }, { cycleWeek: 1 }, { cycleWeek: 12 }];

      await context.loadLevel1Plans();

      const expected = Array.from({ length: 12 }, (_, offset) =>
        ((currentWeek - 1 + offset) % 12) + 1);
      expect(displayedWeeks()).toEqual(expected);
      expect(cards[0].classList.add).toHaveBeenCalledWith('current-week');
      cards.slice(1).forEach((card) => {
        expect(card.classList.add).not.toHaveBeenCalledWith('current-week');
      });
      expect(emptyState.style.display).toBe('none');
      expect(context.window.showSnackbar).not.toHaveBeenCalled();
    },
  );

  it('puts a highlighted placeholder first when the current week has no content', async () => {
    jest.setSystemTime(new Date(2026, 7, 3, 12)); // Week 10
    plans = [{ cycleWeek: 11 }];

    await context.loadLevel1Plans();

    expect(displayedWeeks()).toEqual([10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(cards[0].innerHTML).toContain('No content yet');
    expect(cards[0].innerHTML).toContain('openLevel1Modal(10)');
    expect(cards[0].classList.add).toHaveBeenCalledWith('current-week');
    expect(cards[1].innerHTML).toContain("editClassPlan('week-11')");
  });

  it('advances the first card on the next weekly load without retaining old cards', async () => {
    jest.setSystemTime(new Date(2026, 7, 3, 12)); // Week 10
    await context.loadLevel1Plans();
    expect(displayedWeeks()[0]).toBe(10);

    jest.setSystemTime(new Date(2026, 7, 10, 12)); // Week 11
    await context.loadLevel1Plans();

    expect(displayedWeeks()).toEqual([11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(cards[0].classList.add).toHaveBeenCalledWith('current-week');
  });

  it('wraps at the configured block size rather than assuming twelve weeks', async () => {
    settings.blockSize = 4;
    jest.setSystemTime(new Date(2026, 5, 15, 12)); // Week 3

    await context.loadLevel1Plans();

    expect(displayedWeeks()).toEqual([3, 4, 1, 2]);
    expect(cards[0].classList.add).toHaveBeenCalledWith('current-week');
  });
});
