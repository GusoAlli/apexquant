"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../lib/prisma"));
dotenv_1.default.config();
async function main() {
    const roles = ['admin', 'customer'];
    for (const name of roles) {
        await prisma_1.default.role.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    console.log('Seeded roles');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma_1.default.$disconnect());
