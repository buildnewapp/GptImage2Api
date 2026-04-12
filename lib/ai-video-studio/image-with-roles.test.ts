import assert from "node:assert/strict";
import test from "node:test";

import {
  getImageWithRolesSlotUrl,
  setImageWithRolesSlotUrl,
} from "@/lib/ai-video-studio/image-with-roles";

test("reads image_with_roles urls by role", () => {
  const value = [
    {
      url: "https://cdn.example.com/last.png",
      role: "last_frame",
    },
    {
      url: "https://cdn.example.com/first.png",
      role: "first_frame",
    },
  ];

  assert.equal(
    getImageWithRolesSlotUrl(value, "first_frame"),
    "https://cdn.example.com/first.png",
  );
  assert.equal(
    getImageWithRolesSlotUrl(value, "last_frame"),
    "https://cdn.example.com/last.png",
  );
});

test("sets image_with_roles slot urls in stable role order", () => {
  const value = setImageWithRolesSlotUrl([], "last_frame", "https://cdn.example.com/last.png");
  const nextValue = setImageWithRolesSlotUrl(
    value,
    "first_frame",
    "https://cdn.example.com/first.png",
  );

  assert.deepEqual(nextValue, [
    {
      url: "https://cdn.example.com/first.png",
      role: "first_frame",
    },
    {
      url: "https://cdn.example.com/last.png",
      role: "last_frame",
    },
  ]);
});

test("removes empty image_with_roles slots", () => {
  const value = [
    {
      url: "https://cdn.example.com/first.png",
      role: "first_frame",
    },
    {
      url: "https://cdn.example.com/last.png",
      role: "last_frame",
    },
  ];

  assert.deepEqual(
    setImageWithRolesSlotUrl(value, "first_frame", ""),
    [
      {
        url: "https://cdn.example.com/last.png",
        role: "last_frame",
      },
    ],
  );
});
