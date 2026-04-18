package com.kituirides.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.kituirides.api.common.ApiResponse;
import org.junit.jupiter.api.Test;

class CommonUnitTest {

    @Test
    void apiResponseFactoryMethodsShouldWork() {
        ApiResponse<String> ok = ApiResponse.ok("value", "done");
        assertTrue(ok.success());
        assertEquals("value", ok.data());
        assertEquals("done", ok.message());
    }
}
