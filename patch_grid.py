import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

# The bad string we want to replace
bad_grid_class = "md:grid-cols-[1.5rem_1fr_1fr_1fr_3fr_2fr_1fr_2fr_1.5rem]"
good_grid_class = "md:grid-cols-[1.5rem_1.5fr_4fr_2fr_2fr_1.5rem] lg:grid-cols-[1.5rem_1.5fr_1.5fr_1fr_4fr_2fr_2fr_1.5rem] xl:grid-cols-[1.5rem_1fr_1fr_0.5fr_3fr_1.5fr_1fr_2.5fr_1.5rem]"

content = content.replace(bad_grid_class, good_grid_class)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Grid classes updated successfully.")
