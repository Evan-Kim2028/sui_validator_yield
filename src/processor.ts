import { SuiObjectProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { BigDecimal } from "@sentio/sdk";

// The object ID for SuiSystemState is typically "0x5"
const SUI_SYSTEM_STATE_OBJECT_ID = "0x5";

// Function to start the validator processor
export function ValidatorProcessor() {
  // Bind to the SuiSystemState object
  SuiObjectProcessor.bind({
    objectId: SUI_SYSTEM_STATE_OBJECT_ID,
    network: ChainId.SUI_MAINNET
  }).onTimeInterval(
    async (self, data, ctx) => {
      if (!self) return;

      try {
        // Access the fields of the SuiSystemState object
        //@ts-ignore
        const systemState = self.fields;

        // Get the list of active validators
        //@ts-ignore
        const activeValidators = systemState.active_validators;

        // Iterate over each validator to extract stats
        for (const validatorInfo of activeValidators) {
          //@ts-ignore
          const fields = validatorInfo.fields;

          // Extract relevant fields
          const validatorAddress = fields.sui_address;
          const stakingPoolBalance = Number(fields.staking_pool_sui_balance);
          const rewardsPool = Number(fields.rewards_pool);
          const commissionRate = Number(fields.commission_rate);
          const gasPrice = Number(fields.gas_price);

          // Convert values to more readable formats if necessary
          const stakingPoolBalanceDecimal = BigDecimal(stakingPoolBalance).div(
            1e9 // Assuming SUI has 9 decimals
          );
          const rewardsPoolDecimal = BigDecimal(rewardsPool).div(1e9);

          // Record metrics using the context
          ctx.meter
            .Gauge("staking_pool_balance")
            .record(stakingPoolBalanceDecimal, { validator: validatorAddress });
          ctx.meter
            .Gauge("rewards_pool")
            .record(rewardsPoolDecimal, { validator: validatorAddress });
          ctx.meter
            .Gauge("commission_rate")
            .record(commissionRate, { validator: validatorAddress });
          ctx.meter
            .Gauge("gas_price")
            .record(gasPrice, { validator: validatorAddress });

          // Emit an event with the collected data
          ctx.eventLogger.emit("ValidatorStats", {
            validator: validatorAddress,
            staking_pool_balance: stakingPoolBalanceDecimal,
            rewards_pool: rewardsPoolDecimal,
            commission_rate: commissionRate,
            gas_price: gasPrice,
            // Add any additional fields or tags as needed
          });
        }
      } catch (e) {
        console.error(`Error processing validator stats: ${e.message}`);
      }
    },
    10,     // Minimum interval in seconds
    1440,   // Maximum interval in seconds
    undefined,
    { owned: false } // Set to false because SuiSystemState is not an owned object
  );
}


ValidatorProcessor();