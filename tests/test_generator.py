"""Representative tests for rule-based smoothie generation."""
from smoothie import SmoothieGenerator, load_ingredient_catalog

def generator(): return SmoothieGenerator(load_ingredient_catalog())

def test_generates_multiple_structured_candidates_from_available_pantry() -> None:
    pantry={"banana","strawberry","mango","oat_milk","water","yogurt","protein_powder","honey","cinnamon"}
    result=generator().generate(pantry,count=4,seed=7)
    assert len(result)==4
    assert len({x.ingredient_ids for x in result})==4
    assert all(set(x.ingredient_ids)<=pantry for x in result)
    assert all("liquid" in dict(x.roles).values() and "main_fruit" in dict(x.roles).values() for x in result)

def test_same_seed_is_deterministic() -> None:
    pantry={"banana","strawberry","mango","oat_milk","water","honey","cinnamon"}
    assert generator().generate(pantry,count=5,seed=42)==generator().generate(pantry,count=5,seed=42)

def test_insufficient_pantry_returns_no_candidates() -> None:
    assert generator().generate({"banana","strawberry"},seed=1)==[]

def test_vegan_filter_excludes_dairy() -> None:
    pantry={"banana","strawberry","oat_milk","yogurt","coconut_yogurt"}
    result=generator().generate(pantry,count=20,seed=2,vegan=True)
    assert result and all("yogurt" not in x.ingredient_ids for x in result)

def test_allergen_filter_excludes_matching_ingredients() -> None:
    pantry={"banana","strawberry","oat_milk","peanut_butter","water"}
    result=generator().generate(pantry,count=20,seed=3,excluded_allergens={"peanuts"})
    assert all("peanut_butter" not in x.ingredient_ids for x in result)


def test_sparse_compatibility_tags_do_not_block_valid_two_fruit_smoothie() -> None:
    pantry={"banana","strawberry","water"}
    result=generator().generate(pantry,count=20,seed=1)
    assert any(
        set(candidate.ingredient_ids)=={"banana","strawberry","water"}
        for candidate in result
    )



def test_nuts_can_be_used_as_generated_extras() -> None:
    result = generator().generate(
        {"banana", "water", "walnuts"},
        count=10,
        seed=4,
    )

    assert any("walnuts" in candidate.ingredient_ids for candidate in result)


def test_expanded_full_pantry_generation_is_bounded(monkeypatch) -> None:
    catalog = load_ingredient_catalog()
    smoothie_generator = SmoothieGenerator(catalog)
    pantry = {item.id for item in catalog.all()}
    evaluations = 0
    original = smoothie_generator._candidate_from_choices

    def counted(choices):
        nonlocal evaluations
        evaluations += 1
        return original(choices)

    monkeypatch.setattr(
        smoothie_generator,
        "_candidate_from_choices",
        counted,
    )

    result = smoothie_generator.generate(pantry, count=20, seed=17)

    assert len(result) == 20
    assert len({item.ingredient_ids for item in result}) == 20
    assert all(set(item.ingredient_ids) <= pantry for item in result)
    assert evaluations <= 2_000
