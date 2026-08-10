import { Router } from 'express';
import { auth } from '../../shared/middlewares/auth.js';
import { validate } from '../../shared/middlewares/validate.js';
import { AffiliateProductsController } from './affiliate-products.controller.js';
import { CreateAffiliateProductDto, UpdateAffiliateProductDto } from './affiliate-products.dto.js';

const controller = new AffiliateProductsController();
export const affiliateProductsRoutes: Router = Router();

affiliateProductsRoutes.get('/', auth, controller.list);
affiliateProductsRoutes.post('/', auth, validate(CreateAffiliateProductDto), controller.create);
affiliateProductsRoutes.patch('/:id', auth, validate(UpdateAffiliateProductDto), controller.update);
affiliateProductsRoutes.delete('/:id', auth, controller.remove);
