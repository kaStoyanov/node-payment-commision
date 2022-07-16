process.env.IS_TEST_RUNNING = true;
const app = require('./app')
const supertest = require('supertest')
const request = supertest(app)
let data = []
describe('app service',()=>{

    test('App test running', () => {
        expect(app).toBeDefined();
    });
    test('App GET /fees status code should be  200', async () => {
        const response = await request.get("/fees")

        expect(response.statusCode).toBe(200)

    },100000);


    test('App GET /fees should return JSON', async () => {
        const response = await request.get("/fees")
        expect(response.headers['content-type']).toEqual(expect.stringContaining("json"))

    },100000);

})


