# How to Prepare Your CSV for Bulk Attestation

This guide will walk you through the process of preparing a CSV file for bulk attestation. Following these instructions will help ensure your data is processed quickly and accurately.

## CSV File Structure

Your CSV file must have a specific structure to be parsed correctly:

1.  **Header Row**: The very first line of your file must be a header row that defines the data in each column.
2.  **Data Rows**: Every subsequent line in the file should be a data row, with each cell corresponding to a header column.
3.  **Column Consistency**: Every data row must have the same number of columns as the header row.

## Column Headers

The column headers in your CSV file correspond to the fields of an attestation. The parser is designed to be flexible, so you don't have to worry about exact matches.

### Required Columns

Your CSV **must** include headers for the following fields:

*   `chain_id`: The blockchain where the contract is located.
*   `address`: The contract or EOA address.

### Header Name Flexibility

The parser uses a "fuzzy matching" algorithm (Levenshtein distance) to map your column headers to the correct fields. This means:

*   **Typos are tolerated**: A header like `"addres"` or `"project_namee"` will be correctly mapped to `address` and `project_name`.
*   **Different separators are fine**: You can use spaces, underscores, or hyphens (e.g., `"Chain ID"`, `"chain_id"`, or `"chain-id"` are all treated the same).
*   **Unrecognized columns are ignored**: If you have extra columns in your CSV, they will be ignored during the import process, and you will see a warning.

## Data Formatting and Cleaning

The parser will automatically clean and format your data in several ways to reduce errors.

### `chain_id`

This is one of the most important fields, and the parser can handle a variety of formats:

*   **By Name**: `ethereum`, `optimism`, `polygon`, `base`, etc.
*   **By ID**: `1`, `10`, `137`, `8453`, etc.
*   **By Alias**: `mainnet`, `matic`.
*   **By CAIP-2 Standard**: `eip155:1`, `eip155:10`.

The parser will automatically convert any of these formats into the standardized `eip155:` format.

### Boolean Values (Yes/No)

For fields that require a `true` or `false` value (e.g., `is_contract`), you can use any of the following:

*   **For `true`**: `true`, `1`, or `yes`.
*   **For `false`**: `false`, `0`, or `no`.

### Text Fields with Commas or Quotes

If you have a text value that contains a comma, you **must** enclose the entire value in double quotes (`"`).

*   **Example**: `"This is a description, and it has a comma."`

If your text contains double quotes, you must escape them by adding another double quote.

*   **Example**: `"This description contains ""quoted"" text."`

### Whitespace

Any leading or trailing whitespace in your data will be automatically trimmed.

## Error Handling

The parser is designed to be resilient and will attempt to process as much of your file as possible, even if it contains errors.

*   **Malformed Rows**: If a row has the wrong number of columns or contains an unterminated quote, it will be skipped, and an error message will be displayed that indicates the problematic line number.
*   **Invalid Data**: If a field contains invalid data (e.g., an invalid address format), you will see a warning for that specific cell, but the row will still be imported.
*   **Empty Lines**: Any blank lines in your CSV file will be silently ignored.

### What You Should See After Import

When you successfully import a CSV:

1. **Valid Rows Imported**: All valid rows will appear in the form with proper data conversion applied
2. **Error Notification**: If any rows had errors, you'll see a red notification listing the specific issues
3. **Visual Validation Indicators**: 
   - **Red underlines**: Invalid addresses or other format errors
   - **Yellow warnings**: Missing or unrecognized project names
   - **Dropdown resets**: Unrecognized chain names will show "Select a chain"
4. **Data Conversion**: You'll see automatic conversions like:
   - Chain IDs converted to proper names (e.g., "10" → "Optimism")
   - Boolean values standardized (e.g., "1", "yes" → "Yes")

### Common Error Messages

*   `"Row X has Y cells, but header has Z. Please check for extra or missing commas."`
*   `"Error on data row X: Unterminated quote in CSV line."`
*   `"Invalid project ID: 'project-name'. Project not found."`
*   `"Column 'column-name' was not recognized and will be ignored."`

By providing detailed feedback on errors and warnings, the tool allows you to fix any issues without having to re-upload the entire file.

## Available Fields

Here is a list of all the fields you can include in your CSV file.

| Field ID                | Type          | Description                                             |
| ----------------------- | ------------- | ------------------------------------------------------- |
| `chain_id`              | `Text`        | **Required.** The chain where the contract is located.      |
| `address`               | `Text`        | **Required.** The address of the contract or EOA.         |
| `contract_name`         | `Text`        | The name of the contract.                               |
| `owner_project`         | `Text`        | The name of the project that owns the contract.         |
| `usage_category`        | `Text`        | The category describing the contract's usage.           |
| `version`               | `Number`      | The version number of the contract.                     |
| `is_contract`           | `Boolean`     | `true` if the address is a contract, `false` otherwise.  |
| `is_factory_contract`   | `Boolean`     | `true` if it's a factory contract.                      |
| `is_proxy`              | `Boolean`     | `true` if it's a proxy contract.                        |
| `is_eoa`                | `Boolean`     | `true` if it's an Externally Owned Account.             |
| `deployment_tx`         | `Text`        | The transaction hash of the contract deployment.        |
| `deployer_address`      | `Text`        | The address of the deployer.                            |
| `deployment_date`       | `Date`        | The date of deployment (YYYY-MM-DD).                    |
| `is_safe_contract`      | `Boolean`     | `true` if it is a multisig contract.                    |
| `erc_type`              | `Text`        | The ERC standard (e.g., `erc20`, `erc721`).             |
| `erc20.name`            | `Text`        | The name of the ERC20 token.                            |
| `erc20.symbol`          | `Text`        | The symbol of the ERC20 token.                          |
| `erc20.decimals`        | `Number`      | The decimals for the ERC20 token.                       |
| `erc721.name`           | `Text`        | The name of the ERC721 token.                           |
| `erc721.symbol`         | `Text`        | The symbol of the ERC721 token.                         |
| `erc1155.name`          | `Text`        | The name of the ERC1155 token.                          |
| `erc1155.symbol`        | `Text`        | The symbol of the ERC1155 token.                        |
| `audit`                 | `URL`         | A URL to the audit report.                              |
| `contract_monitored`    | `URL`         | A URL to monitoring information.                        |
| `source_code_verified`  | `URL`         | A URL to the verified source code.                      |
| `paymaster_category`    | `Text`        | Category of the paymaster (`verifying`, `token`, etc.). |
| `is_bundler`            | `Boolean`     | `true` if the address is a bundler.                     |
| `is_paymaster`          | `Boolean`     | `true` if the address is a paymaster.                   |
| `_comment`              | `Text`        | An optional comment for the attestation.                |
| `_source`               | `Text`        | The source of the information.                          |

## For AI Assistants

If you are an AI, please use the following instructions to generate a valid CSV file for bulk attestation:

1.  **Examine the User's Request**: Carefully analyze the user's prompt to identify the data they want to include in the attestations. Extract the relevant entities, such as project names, contract addresses, and chain IDs.
2.  **Use the Correct Headers**: Use the "Field ID" from the table above as the header for each column. The headers `chain_id` and `address` are mandatory.
3.  **Format the Data Correctly**:
    *   For `chain_id`, use the lowercase name (e.g., `ethereum`).
    *   For `Boolean` fields, use `true` or `false`.
    *   If any text field contains a comma, enclose the entire string in double quotes (`"`).
    *   If any text field contains double quotes, escape them with an additional double quote (`""`).
4.  **Generate the CSV**: Create a text block with the CSV data. Ensure the first line is the header row, and each subsequent line is a data row.
5.  **Review and Verify**: Before presenting the CSV to the user, double-check that the data aligns with the headers and that all formatting rules have been followed. Ensure that every row has the same number of columns as the header.
