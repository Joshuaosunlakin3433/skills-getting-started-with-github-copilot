import pytest

from src.app import activities


def test_signup_rejects_activity_at_capacity(client):
    # Arrange
    activity_name = "Chess Club"
    activity = activities[activity_name]
    capacity = activity["max_participants"]
    activity["participants"] = [
        f"student{index}@mergington.edu" for index in range(capacity)
    ]
    email = "overflow.student@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"
