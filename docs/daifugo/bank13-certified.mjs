// 4000 strict-qualified fixed-deal scenarios; 2000 previous entries retained.
import {rows as r1} from './bank13-certified-r1.mjs?v=22';
import {rows as n1} from './bank13-certified-r1-1.mjs?v=23';
import {rows as r2} from './bank13-certified-r2.mjs?v=22';
import {rows as n2} from './bank13-certified-r2-1.mjs?v=23';
import {rows as r3} from './bank13-certified-r3.mjs?v=22';
import {rows as n3} from './bank13-certified-r3-1.mjs?v=23';
import {rows as r4} from './bank13-certified-r4.mjs?v=22';
import {rows as n4} from './bank13-certified-r4-1.mjs?v=23';
export const bank=[...r1,...n1,...r2,...n2,...r3,...n3,...r4,...n4];
