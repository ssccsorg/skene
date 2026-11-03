// The kinds the frame ships, installed for every test.
//
// A kind registers itself where its module is written, so a test that reads a declaration has to import the kinds the way
// a deployment's entry does. This is the frame's own entry less the React tree: the register is what is needed, and the
// modules that fill it.
import '@/kinds';
