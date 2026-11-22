from pathlib import Path
import joblib
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

BASE = Path(__file__).resolve().parent
rng = np.random.default_rng(42)

features = [
    "rainfall_mm_24h",
    "rainfall_mm_3d",
    "water_level_pct",
    "drainage_capacity_pct"
]

# 90 fictional flood observations
rain24 = rng.uniform(0, 250, 90)
rain3d = rng.uniform(0, 500, 90)
water = rng.uniform(0, 100, 90)
drainage = rng.uniform(0, 100, 90)

X = np.column_stack([rain24, rain3d, water, drainage])

# Synthetic demonstration labels, NOT real flood outcomes
score = (
    rain24 / 250 * 0.35 +
    rain3d / 500 * 0.20 +
    water / 100 * 0.30 +
    (100 - drainage) / 100 * 0.15
)

y = np.where(score < 0.35, "low",
    np.where(score < 0.60, "medium", "high"))

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42,
    stratify=y
)

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)
model.fit(X_train, y_train)

pred = model.predict(X_test)

bundle = {
    "model": model,
    "features": features,
    "classes": list(model.classes_),
    "data_type": "synthetic demonstration"
}

joblib.dump(bundle, BASE / "flood_rf_model.joblib")

print("MODEL TRAINED SUCCESSFULLY")
print("Scikit-learn:", sklearn.__version__)
print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))
print("Synthetic test accuracy:",
      round(accuracy_score(y_test, pred) * 100, 2), "%")
print("Saved:", BASE / "flood_rf_model.joblib")
