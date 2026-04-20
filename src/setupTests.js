// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const originalConsoleError = console.error;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const firstArg = String(args[0] || '');

    if (firstArg.includes('ReactDOMTestUtils.act is deprecated')) {
      return;
    }

    originalConsoleError(...args);
  });
});

afterAll(() => {
  console.error.mockRestore();
});
