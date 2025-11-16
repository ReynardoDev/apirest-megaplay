import {config} from 'dotenv'

config();




export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_USER = process.env.DB_USER || 'root';
export const DB_NAME = process.env.DB_NAME || 'all_prod';
export const DB_PORT = process.env.DB_PORT || 3306;
export const BASE_PORT = process.env.BASE_PORT || 3000;