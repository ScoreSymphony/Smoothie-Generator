"""Rule-based smoothie generation independent of the UI."""
from __future__ import annotations
from dataclasses import dataclass
from itertools import combinations, product
import random
from .ingredient_catalog import IngredientCatalog
from .ingredients import Ingredient, IngredientCategory

@dataclass(frozen=True)
class GeneratedSmoothie:
    ingredient_ids: tuple[str,...]
    roles: tuple[tuple[str,str],...]

class SmoothieGenerator:
    def __init__(self,catalog: IngredientCatalog) -> None:
        self.catalog=catalog

    def generate(self, pantry_ids, *, count: int=5, seed: int|None=None,
                 vegan: bool=False, excluded_allergens=frozenset()) -> list[GeneratedSmoothie]:
        allowed=[]
        allergens=set(excluded_allergens)
        for item_id in dict.fromkeys(pantry_ids):
            ingredient=self.catalog.resolve(item_id)
            if ingredient is None: continue
            if vegan and not ingredient.vegan: continue
            if allergens.intersection(ingredient.allergens): continue
            allowed.append(ingredient)
        fruits=[x for x in allowed if x.category in {IngredientCategory.FRUIT,IngredientCategory.BERRIES}]
        liquids=[x for x in allowed if x.category==IngredientCategory.LIQUID]
        if not fruits or not liquids: return []
        fruit_groups=[(x,) for x in fruits]+list(combinations(fruits,2))
        creamy=[None]+[x for x in allowed if x.category==IngredientCategory.CREAMY_BASE]
        protein=[None]+[x for x in allowed if x.category==IngredientCategory.PROTEIN]
        sweet=[None]+[x for x in allowed if x.category==IngredientCategory.SWEETENER]
        extras=[None]+[x for x in allowed if x.category in {IngredientCategory.BOOSTERS,IngredientCategory.SPICES,IngredientCategory.SEEDS,IngredientCategory.GREENS}]
        candidates=[]
        for fg,liquid,cream,prot,sugar,extra in product(fruit_groups,liquids,creamy,protein,sweet,extras):
            chosen=[*fg,liquid,*[x for x in (cream,prot,sugar,extra) if x]]
            if not self._valid(chosen, liquid): continue
            roles=[]
            for x in fg: roles.append((x.id,"main_fruit"))
            roles.append((liquid.id,"liquid"))
            for x,role in ((cream,"creamy_base"),(prot,"protein"),(sugar,"sweetener"),(extra,"extra")):
                if x: roles.append((x.id,role))
            candidates.append(GeneratedSmoothie(tuple(x.id for x in chosen),tuple(roles)))
        # deterministic candidate universe; seed only controls which valid distinct options are presented
        candidates=sorted(set(candidates),key=lambda x:x.ingredient_ids)
        rng=random.Random(seed); rng.shuffle(candidates)
        return candidates[:max(0,count)]

    @staticmethod
    def _valid(chosen: list[Ingredient], liquid: Ingredient) -> bool:
        # A liquid must materially contribute fluid; very dry/high-intensity combinations are rejected.
        if liquid.water_contribution < 3: return False
        if sum(x.intensity >= 5 for x in chosen) > 1: return False
        tags=[set(x.compatibility_tags) for x in chosen if x.compatibility_tags]
        # If ingredients declare compatibility vocabulary, require at least some shared affinity.
        if len(tags)>=2 and not any(a & b for i,a in enumerate(tags) for b in tags[i+1:]): return False
        return True
