// The host a test stands a shell up with, which is the frame's own adapter rather than a copy of it.
//
// A suite imports this file rather than `@/lib/testing` because the tests here were written against it, and the import
// it stands for is the one place the stub is turned into a host.

export { installHost } from '@/lib/testing';
