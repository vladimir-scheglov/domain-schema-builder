# CLI Reference — Domain Schema Builder

Референс по командной строке `dsb`. Покрывает все команды, опции, форматы вывода и типовые сценарии.

- **Версия:** 0.2
- **Бинарь:** `dsb`
- **Node.js:** ≥ 20

---

## Содержание

1. [Установка](#установка)
2. [Быстрый старт](#быстрый-старт)
3. [Общие принципы](#общие-принципы)
4. [Команды](#команды)
   - [generate / gen](#generate--gen)
   - [validate](#validate)
   - [info](#info)
   - [inspect](#inspect)
   - [init](#init)
5. [Опции](#опции)
6. [Форматы вывода](#форматы-вывода)
7. [Сценарии использования](#сценарии-использования)
8. [Переменные окружения](#переменные-окружения)
9. [Коды возврата](#коды-возврата)
10. [Troubleshooting](#troubleshooting)

---

## Установка

### Локально (из исходников)

```bash
git clone <repo-url>
cd domain-schema-builder
npm install
npm run build
```

После сборки CLI доступен как `./dist/cli.js`, а через `npx tsx src/cli.ts` — в dev-режиме.

### Глобально через npm link

```bash
cd domain-schema-builder
npm run build
npm link
```

Теперь команда `dsb` доступна в любом терминале.

### Через npx (после публикации)

```bash
npx @org/dsb gen example.dsl.yaml
```

### В dev-режиме

```bash
npx tsx src/cli.ts <command> [options]
```

Работает быстрее, чем `node dist/cli.js`, потому что не требует сборки.

---

## Быстрый старт

```bash
# Создать шаблон DSL
dsb init my-domain.dsl.yaml

# Отредактировать my-domain.dsl.yaml в любимом редакторе…

# Проверить валидность
dsb validate my-domain.dsl.yaml

# Сгенерировать YAML-схему
dsb gen my-domain.dsl.yaml
# → my-domain.schema.yaml

# Смотреть изменения в реальном времени
dsb gen my-domain.dsl.yaml --watch
```

---

## Общие принципы

### Соглашения

- **Все команды принимают путь к DSL-файлу** как позиционный аргумент.
- **Выходной файл по умолчанию** — рядом с входным, с расширением `.schema.yaml`.
- **Ошибки валидации** выводятся в stderr и приводят к exit code 1.
- **Успешная работа** — exit code 0.

### Цвета

CLI использует ANSI-цвета для:

- зелёный — успех, добавленные строки в diff;
- красный — ошибки, удалённые строки в diff;
- жёлтый — предупреждения;
- серый — контекст в diff;
- cyan — заголовки блоков diff.

Отключается через `--no-color` или переменную `NO_COLOR=1`.

### Shebang

CLI-файл начинается с `#!/usr/bin/env node`. После `npm link` команда `dsb` исполняется напрямую, без явного вызова `node`.

---

## Команды

### generate / gen

Генерирует YAML-схему домена из DSL-файла.

```
dsb generate <input> [options]
dsb gen <input> [options]
```

**Аргументы:**

| Аргумент | Обяз. | Описание |
|---|---|---|
| `<input>` | ✅ | Путь к DSL-файлу (`.dsl.yaml`) |

**Опции:**

| Опция | Короткая | По умолчанию | Описание |
|---|---|---|---|
| `--out <path>` | `-o` | рядом с input | Путь для сохранения YAML-схемы |
| `--watch` | `-w` | `false` | Следить за изменениями входного файла |
| `--stdout` | | `false` | Вывести YAML в stdout, не сохранять |
| `--diff` | | `true` | Показывать diff при перегенерации в watch-режиме |
| `--no-diff` | | | Отключить показ diff |
| `--quiet` | | `false` | Не выводить diff, только сообщения о сохранении |
| `--no-color` | | | Отключить цветной вывод |
| `--context <n>` | | `3` | Сколько строк контекста вокруг изменений |

**Примеры:**

```bash
# Базовая генерация
dsb gen domain.dsl.yaml
# → domain.schema.yaml рядом с input

# Указать выходной файл
dsb gen domain.dsl.yaml -o build/schema.yaml

# Вывести в stdout (для пайпа)
dsb gen domain.dsl.yaml --stdout > schema.yaml

# Watch с diff
dsb gen domain.dsl.yaml -w

# Watch без цветов (для логов)
dsb gen domain.dsl.yaml -w --no-color > gen.log

# Тихий режим — только сообщения о сохранении
dsb gen domain.dsl.yaml -w --quiet

# Больше контекста в diff
dsb gen domain.dsl.yaml -w --context 8
```

**Вывод:**

```
✅ [15:42:01] /path/to/domain.schema.yaml
```

Или в watch-режиме:

```
✅ [15:42:01] /path/to/domain.schema.yaml
👀 Следим за /path/to/domain.dsl.yaml... (Ctrl+C для выхода)

📝 Изменения:
@@ ... @@
     attributes:
       - id: value
         dataType: String
+  - id: Server
+    name: Сервер
+    attributes:
+      - id: hostname
+        dataType: String

✅ [15:43:27] /path/to/domain.schema.yaml
```

**Ошибки:**

При ошибке парсинга или валидации:

```
❌ Ошибка генерации:
Ошибки валидации:
  [UNRESOLVED_REFERENCE] (entities.Ioc.attributes.sources) Элемент массива 'Ioc.sources' ссылается на несуществующую сущность 'IocSourceTypo'
```

В watch-режиме ошибка не останавливает процесс — исправляете DSL, сохраняете, генерация повторяется.

---

### validate

Проверяет DSL-файл без генерации.

```
dsb validate <input>
```

**Аргументы:**

| Аргумент | Обяз. | Описание |
|---|---|---|
| `<input>` | ✅ | Путь к DSL-файлу |

**Что проверяет:**

1. **Синтаксис YAML** — правильно ли написан файл.
2. **Структура DSL** — есть ли обязательные секции (`domain`, `version`, `entities`).
3. **Семантику IR** — все коды ошибок:
   - `DUPLICATE_ENTITY_ID`, `DUPLICATE_ATTRIBUTE_ID`, `DUPLICATE_DATATYPE_ID`
   - `UNRESOLVED_REFERENCE`, `UNRESOLVED_DATATYPE`, `UNRESOLVED_SEQUENCE`
   - `IDENTIFIER_NO_SEQUENCE_NO_TEMPLATE`
   - `DEFAULT_NOT_ALLOWED`
   - `REFERENCE_WITHOUT_ENTITY`
   - `UNRESOLVED_INHERITS`, `INHERITANCE_CYCLE`
   - `UNRESOLVED_LINKAGE_SIDE`
   - `EMPTY_ENUM`
   - `WORKFLOW_NO_STATUSES`, `WORKFLOW_NO_INITIAL`, `WORKFLOW_INITIAL_UNKNOWN`, `WORKFLOW_TRANSITION_UNKNOWN_STATE`
   - `UNRESOLVED_TREE_ENTITY`, `UNRESOLVED_TREE_LINKAGE`
   - `PREFIX_RULE_ATTR_NOT_FOUND`

   Полный список — в [DSL.md](DSL.md#ошибки-и-валидация).

**Примеры:**

```bash
dsb validate domain.dsl.yaml
```

**Вывод при успехе:**

```
✅ Валидация пройдена
```

**Вывод при ошибках:**

```
❌ [UNRESOLVED_REFERENCE] (entities.Ioc.attributes.sources) Элемент массива 'Ioc.sources' ссылается на несуществующую сущность 'IocSourceTypo'
❌ [INHERITANCE_CYCLE] (entities.Server.inherits) Циклическое наследование у сущности 'Server'
❌ [UNRESOLVED_TREE_LINKAGE] (trees.RiskTree) Дерево 'RiskTree': связь 'WrongLinkage' не найдена
```

**Warning'и не блокируют** валидацию, но выводятся:

```
⚠️ [MENU_ITEM_NO_VIEW] (menus.menus_iocs.items.IocMenu) Пункт меню 'IocMenu' не имеет привязанного представления
✅ Валидация пройдена
```

**Exit code:**

- `0` — валидация пройдена.
- `1` — есть ошибки.

**Типовое использование в CI:**

```bash
#!/bin/bash
set -e
for f in schemas/*.dsl.yaml; do
  echo "Проверяю $f"
  dsb validate "$f"
done
```

---

### info

Краткая сводка по DSL-файлу.

```
dsb info <input>
```

**Аргументы:**

| Аргумент | Обяз. | Описание |
|---|---|---|
| `<input>` | ✅ | Путь к DSL-файлу |

**Что показывает:**

- Идентификатор и версия домена.
- Список сущностей с числом атрибутов.
- Список связей.
- Список деревьев.
- Список типов данных (enum, workflow).
- Структуру меню.

**Примеры:**

```bash
dsb info examples/iocs.dsl.yaml
```

**Вывод:**

```
📦 Домен: iocs.test
🏷  Название: IOCs Domain
🔢 Версия: 0.0.1

📋 Сущности (3):
   • Ioc — Индикатор (4 атрибутов)
   • IocSource — Источник индикатора (3 атрибутов)
   • Incident — Инцидент (4 атрибутов)

🔗 Связи (1):
   • Ioc ↔ Incident (n_n)

🌳 Деревья (1):
   • IocTree: Ioc > Source > Incident

🎨 Типы данных (2):
   • IocType (Enum, 6 значений)
   • IncidentStatus (Enum, 3 значений)

📁 Меню:
   • IOCs Domain (/iocs)
     - Индикатор → /iocs/ioc
     - Источник индикатора → /iocs/iocsource
     - Инцидент → /iocs/incident
     - Дерево Ioc → /iocs/ioctree
```

**Когда использовать:**

- Быстрый обзор домена без открытия YAML.
- Для документации — можно копировать вывод.
- Для дебага — понять, что парсер собрал в IR.

---

### inspect

Показывает IR в JSON. Для отладки.

```
dsb inspect <input>
```

**Аргументы:**

| Аргумент | Обяз. | Описание |
|---|---|---|
| `<input>` | ✅ | Путь к DSL-файлу |

**Примеры:**

```bash
dsb inspect examples/iocs.dsl.yaml | head -50
```

**Вывод (сокращённо):**

```json
{
  "domain": "iocs.test",
  "version": "0.0.1",
  "name": "IOCs Domain",
  "entities": [
    {
      "id": "Ioc",
      "name": "Индикатор",
      "label": "{type}: {value}",
      "generatePage": true,
      "attributes": [
        { "id": "value", "dataType": "String" },
        { "id": "type", "dataType": "IocType" },
        {
          "id": "sources",
          "dataType": "Array",
          "item": { "dataType": "Reference", "entity": "IocSource" }
        },
        { "id": "iocId", "dataType": "Identifier", "sequence": "IOCSeq" }
      ]
    }
  ],
  "dataTypes": [...],
  "trees": [
    {
      "id": "IocTree",
      "type": "ordinary",
      "hierarchy": {
        "entity": "Ioc",
        "children": [
          { "linkage": "Ioc_Source", "entity": "Source" }
        ]
      }
    }
  ],
  "actions": [...],
  "views": [...],
  "menus": [...],
  "dataRules": [...],
  "medias": [...]
}
```

**Когда использовать:**

- Проверить, как парсер развернул краткую форму (`enum(X)` → `dataType: X`).
- Проверить, как развернулись флаги `ui:` (`generateList`, `generatePage`).
- Проверить, как построилось дерево.
- Найти ошибку в трансформации.
- Понять, что именно попадает в генераторы.

**Совет:** используй `jq` для фильтрации:

```bash
# Список сущностей
dsb inspect domain.dsl.yaml | jq '.entities[].id'

# Атрибуты конкретной сущности
dsb inspect domain.dsl.yaml | jq '.entities[] | select(.id == "Ioc") | .attributes'

# Флаги UI
dsb inspect domain.dsl.yaml | jq '.entities[] | { id, generateList, generateModals, generatePanel, generatePage }'

# Деревья
dsb inspect domain.dsl.yaml | jq '.trees'

# Список связей
dsb inspect domain.dsl.yaml | jq '.linkages[] | { id, side1, side2, type }'
```

---

### init

Создаёт шаблон DSL-файла.

```
dsb init [path]
```

**Аргументы:**

| Аргумент | Обяз. | По умолчанию | Описание |
|---|---|---|---|
| `[path]` | | `domain.dsl.yaml` | Куда сохранить шаблон |

**Примеры:**

```bash
# Создать в текущей папке
dsb init
# → domain.dsl.yaml

# Создать с именем
dsb init my-domain.dsl.yaml

# Создать в подпапке
dsb init schemas/audit.dsl.yaml
```

**Что создаётся:**

```yaml
domain: example.test
version: 0.0.1
name: Example Domain
description: Пример домена
author: Your Name
tags: [example]

entities:
  Item:
    name: Элемент
    label: "{title}"
    attributes:
      title: String
      description: String
      status:
        type: enum(ItemStatus)
        default: OPEN

enums:
  ItemStatus:
    OPEN: Открыт
    CLOSED: Закрыт

menus:
  - Item
```

**Ошибки:**

Если файл уже существует:

```
❌ Файл уже существует: /path/to/domain.dsl.yaml
```

**Совет:** после `init` сразу замените:

1. `domain` на свой FQDN.
2. `name` на название домена.
3. Сущность `Item` на свою.
4. Значения `ItemStatus` на свои.

---

## Опции

### `--watch` / `-w`

Следит за изменениями входного файла. При каждом сохранении перегенерирует YAML и (если включён diff) показывает изменения.

**Как работает:**

1. Запускает первую генерацию.
2. Подписывается на события `fs.watch` входного файла.
3. При изменении — с дебаунсом 100 мс — перечитывает, парсит, генерирует.
4. Если YAML отличается — печатает diff.
5. Записывает выходной файл.

**Защита от лишних событий:** хэш содержимого DSL. Если файл сохранён без изменений — не перегенерируется.

**Пример:**

```bash
dsb gen domain.dsl.yaml -w
```

**Выход:** `Ctrl+C`.

### `--diff` / `--no-diff`

Управляет показом diff в watch-режиме. По умолчанию включён.

**Показывает:**

- **`+`** (зелёные) — добавленные строки.
- **`-`** (красные) — удалённые строки.
- **Контекст** (серый) — неизменённые строки.
- **`@@ ... @@`** (cyan) — разделители.

**Отключить:**

```bash
dsb gen domain.dsl.yaml -w --no-diff
```

### `--context <n>`

Сколько строк контекста показывать вокруг изменений. По умолчанию 3.

```bash
dsb gen domain.dsl.yaml -w --context 8
```

С `--context 0` — только изменённые строки.

### `--quiet`

Не выводить diff, только сообщения о сохранении.

```bash
dsb gen domain.dsl.yaml -w --quiet
```

**Вывод:**

```
✅ [15:42:01] /path/to/domain.schema.yaml
✅ [15:43:27] /path/to/domain.schema.yaml
```

### `--no-color`

Отключить ANSI-цвета.

```bash
dsb gen domain.dsl.yaml -w --no-color > gen.log
```

**Альтернатива:** `NO_COLOR=1`.

```bash
NO_COLOR=1 dsb gen domain.dsl.yaml -w
```

### `--stdout`

Вывести YAML в stdout, не сохраняя в файл.

```bash
dsb gen domain.dsl.yaml --stdout
```

**Когда использовать:**

- Пайп в другую команду:

```bash
dsb gen domain.dsl.yaml --stdout | yq '.entities[].id'
```

- Сравнение двух схем:

```bash
diff <(dsb gen old.dsl.yaml --stdout) <(dsb gen new.dsl.yaml --stdout)
```

**Внимание:** в режиме `--stdout` diff не показывается.

### `--out <path>` / `-o`

Указать путь для сохранения YAML-схемы.

```bash
mkdir -p build
dsb gen domain.dsl.yaml -o build/schema.yaml
```

Если папка не существует — команда упадёт с ошибкой.

---

## Форматы вывода

### Успех

```
✅ [HH:MM:SS] <путь>
```

### Ошибка валидации

```
❌ [<код>] (<путь>) <сообщение>
```

**Многократные ошибки** — по одной на строку:

```
❌ [UNRESOLVED_REFERENCE] (entities.Ioc.attributes.sources) ...
❌ [INHERITANCE_CYCLE] (entities.Server.inherits) ...
❌ [UNRESOLVED_TREE_LINKAGE] (trees.RiskTree) ...
```

### Ошибка парсинга

```
❌ Ошибка разбора:
<сообщение парсера YAML>
```

### Diff

```
📝 Изменения:
@@ ... @@
 <контекст серый>
- <удалённая строка красная>
+ <добавленная строка зелёная>
```

### Info

Секции с эмодзи:

```
📦 Домен: <domain>
🏷  Название: <name>
🔢 Версия: <version>

📋 Сущности (<N>):
   • <id> — <name> (<M> атрибутов)

🔗 Связи (<N>):
   • <side1> <направление> <side2> (<тип>)

🌳 Деревья (<N>):
   • <id>: <цепочка>

🎨 Типы данных (<N>):
   • <id> (<kind>, <M> значений)

📁 Меню:
   • <label> (<route>)
     - <item.label> → <item.route>
```

---

## Сценарии использования

### 1. Первый запуск

```bash
dsb init my-domain.dsl.yaml
vim my-domain.dsl.yaml
dsb validate my-domain.dsl.yaml
dsb gen my-domain.dsl.yaml
```

### 2. Итеративная разработка

```bash
# Терминал 1: watch с diff
dsb gen my-domain.dsl.yaml -w

# Терминал 2: редактор
vim my-domain.dsl.yaml
```

### 3. Работа с деревьями

```bash
# Генерируем схему с деревом
dsb gen risk.dsl.yaml

# Смотрим, как развернулось дерево
dsb inspect risk.dsl.yaml | jq '.trees'

# Проверяем, что сгенерирован view для дерева
dsb gen risk.dsl.yaml --stdout | yq '.views[] | select(.type == "tree")'
```

### 4. Работа с флагами UI

```bash
# Проверяем флаги в IR
dsb inspect domain.dsl.yaml | jq '.entities[] | { id, generateList, generateModals, generatePanel, generatePage }'

# Смотрим, что не сгенерировано для сущности с list: false
dsb gen domain.dsl.yaml --stdout | yq '.views[] | select(.id == "lists_category")'
# → пусто
```

### 5. CI-проверка

```bash
#!/bin/bash
set -e

for f in schemas/*.dsl.yaml; do
  echo "Проверяю $f"
  dsb validate "$f"
done

echo "Все схемы валидны"
```

### 6. Публикация

```bash
# Генерируем все схемы в build/
mkdir -p build
for f in schemas/*.dsl.yaml; do
  name=$(basename "$f" .dsl.yaml)
  dsb gen "$f" -o "build/$name.schema.yaml"
done

# Загружаем в систему
for f in build/*.schema.yaml; do
  curl -X POST https://api.example.com/schemas \
    -H "Content-Type: application/yaml" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$f"
done
```

### 7. Сравнение версий

```bash
git checkout v1.0
dsb gen domain.dsl.yaml --stdout > /tmp/v1.yaml

git checkout main
dsb gen domain.dsl.yaml --stdout > /tmp/v2.yaml

diff -u /tmp/v1.yaml /tmp/v2.yaml | less
```

### 8. Генерация Markdown-документации

```bash
dsb info domain.dsl.yaml > docs/domain-overview.md
```

### 9. Проверка что флаги работают

```bash
# Сущность с list: false
cat > /tmp/test.dsl.yaml << 'EOF'
domain: test.test
version: 0.0.1
entities:
  Ioc:
    ui:
      list: false
    attributes:
      value: String
EOF

# Проверяем, что списка нет
dsb gen /tmp/test.dsl.yaml --stdout | grep "lists_ioc"
# → пусто

# Проверяем, что в IR флаг есть
dsb inspect /tmp/test.dsl.yaml | jq '.entities[0].generateList'
# → false
```

---

## Переменные окружения

| Переменная | Эффект |
|---|---|
| `NO_COLOR=1` | Отключает цветной вывод (эквивалент `--no-color`) |
| `FORCE_COLOR=1` | Принудительно включает цвета даже при `--no-color` |
| `NODE_ENV=production` | Не влияет на CLI |

**Приоритет:** `--no-color` > `NO_COLOR` > `FORCE_COLOR`.

---

## Коды возврата

| Код | Значение |
|---|---|
| `0` | Успех |
| `1` | Ошибка (валидация, парсинг, файл не найден) |

**Пример использования в скрипте:**

```bash
if dsb validate domain.dsl.yaml; then
  echo "OK, генерирую схему"
  dsb gen domain.dsl.yaml
else
  echo "Есть ошибки, пропускаю"
  exit 1
fi
```

---

## Troubleshooting

### «command not found: dsb»

CLI не установлен глобально.

```bash
# Вариант 1: через npx tsx
npx tsx src/cli.ts gen domain.dsl.yaml

# Вариант 2: npm link
cd domain-schema-builder
npm run build
npm link

# Вариант 3: node dist/cli.js
node dist/cli.js gen domain.dsl.yaml
```

### «SyntaxError: Invalid or unexpected token» при запуске dsb

В `dist/cli.js` нет shebang или файл не имеет прав на исполнение.

```bash
head -1 dist/cli.js
# должно быть #!/usr/bin/env node

chmod +x dist/cli.js
```

### Diff не появляется в watch-режиме

**Причины:**

1. YAML не меняется.
2. `--no-diff` передан.
3. `--quiet` передан.
4. `--stdout` — в этом режиме diff не работает.

**Проверка:**

```bash
dsb gen domain.dsl.yaml
# Правим DSL
dsb gen domain.dsl.yaml
# Смотрим, отличаются ли файлы
diff <(git show HEAD:domain.schema.yaml) domain.schema.yaml
```

### Watch не реагирует на изменения файла

**Причины:**

1. Редактор сохраняет файл атомарно (через rename).
2. Слишком быстрые изменения — debounce 100 мс может пропустить.

**Решение:**

- Сохраните файл вручную (`:w` в vim, `Cmd+S` в VS Code).
- Проверьте путь.

### Ошибки валидации, но YAML парсится

DSL структурно валиден, но семантически некорректен.

```bash
dsb validate domain.dsl.yaml
# Смотрим конкретные коды ошибок
```

Каждый код описан в [DSL.md](DSL.md#ошибки-и-валидация).

### Diff показывает весь файл как изменённый

**Причины:**

1. Изменились окончания строк (CRLF ↔ LF).
2. Изменилась кодировка.
3. YAML-сериализатор выдаёт другой порядок ключей.

**Решение:** настройте редактор на `LF` и `UTF-8 without BOM`.

### Команда `info` показывает не то, что ожидалось

Скорее всего, парсер неправильно развернул краткую форму.

```bash
dsb inspect domain.dsl.yaml | jq .
```

### «Cannot find module './index.js'»

Запуск `node dist/cli.js` без предварительной сборки.

```bash
npm run build
node dist/cli.js --help
```

### `dsb gen` падает с `ref.includes is not a function`

В DSL есть поле, которое парсится как число, а не строка. Например:

```yaml
entities:
  Ioc:
    inherits: 123      # ← число
```

Или `entity: 42` в `Reference`. **Проверьте, что все ID — строки**.

### После изменения `src/` CLI показывает старую схему

**Причина:** не пересобран `dist/`.

**Решение:**

```bash
npm run build
```

Это же касается web-UI — он использует **собранный** `dist/index.js`.

### Дерево не генерируется

**Причина:** связи между сущностями не определены или их несколько.

**Проверка:**

```bash
dsb inspect domain.dsl.yaml | jq '.linkages'
```

Убедитесь, что между каждой парой сущностей есть **ровно одна** связь. Если больше — укажите ID явно в цепочке:

```yaml
trees:
  RiskTree: A >(A_B) B >(B_C) C
```

### Флаг `ui.page: true` не работает

**Причина:** не пересобран `dist/`.

**Проверка:**

```bash
dsb inspect domain.dsl.yaml | jq '.entities[0].generatePage'
# → true

dsb gen domain.dsl.yaml --stdout | grep "pages_info"
# → должно быть
```

Если `inspect` показывает `true`, а `gen` не создаёт `pages_info` — ядро не пересобрано.

---

## Что дальше

- [DSL Reference](DSL.md) — описание языка.
- [User Guide](USER_GUIDE.md) — работа с web-редактором.
- [Examples](EXAMPLES.md) — примеры доменов.
- [Architecture](ARCHITECTURE.md) — как устроен генератор.

---

**Версия документа:** 0.2 · **Дата:** 2025