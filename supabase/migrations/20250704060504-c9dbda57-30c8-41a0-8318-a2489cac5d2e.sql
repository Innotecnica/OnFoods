-- Create sample categories and products for testing (simplified)
WITH establishment_data AS (
  SELECT id as establishment_id FROM establishments WHERE is_active = true LIMIT 1
),
category_inserts AS (
  INSERT INTO categories (establishment_id, name, description, display_order, is_active)
  SELECT establishment_id, 'Hambúrgueres', 'Deliciosos hambúrgueres artesanais', 1, true FROM establishment_data
  UNION ALL
  SELECT establishment_id, 'Bebidas', 'Refrescos e bebidas geladas', 2, true FROM establishment_data
  UNION ALL  
  SELECT establishment_id, 'Sobremesas', 'Sobremesas irresistíveis', 3, true FROM establishment_data
  RETURNING id, name, establishment_id
),
product_inserts AS (
  INSERT INTO products (establishment_id, category_id, name, description, price, is_available, preparation_time, ingredients)
  SELECT 
    e.establishment_id,
    c.id,
    products_data.name,
    products_data.description,
    products_data.price,
    products_data.is_available,
    products_data.preparation_time,
    products_data.ingredients
  FROM establishment_data e
  CROSS JOIN category_inserts c
  CROSS JOIN (VALUES
    ('Tony Burger Clássico', 'Hambúrguer com carne bovina, queijo, alface, tomate e molho especial', 25.90, true, 15, ARRAY['pão brioche', 'carne bovina', 'queijo cheddar', 'alface', 'tomate', 'molho especial'], 'Hambúrgueres'),
    ('Tony Bacon Burger', 'Hambúrguer com carne bovina, bacon crocante, queijo e molho barbecue', 29.90, true, 18, ARRAY['pão brioche', 'carne bovina', 'bacon', 'queijo cheddar', 'molho barbecue'], 'Hambúrgueres'),
    ('Tony Veggie', 'Hambúrguer vegetariano com blend de legumes e molho de ervas', 22.90, true, 12, ARRAY['pão integral', 'blend de legumes', 'queijo vegano', 'alface', 'tomate', 'molho de ervas'], 'Hambúrgueres'),
    ('Coca-Cola 350ml', 'Refrigerante gelado', 5.50, true, 2, ARRAY['coca-cola'], 'Bebidas'),
    ('Suco de Laranja Natural', 'Suco natural da fruta', 8.90, true, 3, ARRAY['laranja natural'], 'Bebidas'),
    ('Brownie com Sorvete', 'Brownie quentinho com sorvete de baunilha', 14.90, true, 8, ARRAY['brownie de chocolate', 'sorvete de baunilha', 'calda de chocolate'], 'Sobremesas')
  ) AS products_data(name, description, price, is_available, preparation_time, ingredients, category_name)
  WHERE c.name = products_data.category_name
  RETURNING id, name
)
INSERT INTO product_tags (product_id, tag) 
SELECT p.id, 'popular' FROM product_inserts p WHERE p.name IN ('Tony Burger Clássico', 'Tony Bacon Burger')
UNION ALL
SELECT p.id, 'vegetariano' FROM product_inserts p WHERE p.name = 'Tony Veggie'
UNION ALL
SELECT p.id, 'gelado' FROM product_inserts p WHERE p.name LIKE '%Coca-Cola%' OR p.name LIKE '%Suco%';